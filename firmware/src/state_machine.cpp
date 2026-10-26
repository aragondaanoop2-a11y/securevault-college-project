#include "state_machine.h"
#include "web_server.h"

StateMachine stateMachine;

StateMachine::StateMachine()
    : currentState(STATE_LOCKED),
      currentStage(0),
      failedAttempts(0),
      servoAngle(SERVO_LOCKED_ANGLE),
      keypadIdx(0),
      stageTimeoutMs(0),
      otpIssuedMs(0),
      unlockTimeMs(0),
      lockoutStartMs(0),
      alarmBuzzerToggleMs(0),
      buzzerState(false),
      enrollMode(false)
{
    memset(keypadBuffer, 0, sizeof(keypadBuffer));
    memset(activeOtp, 0, sizeof(activeOtp));
    memset(currentCardUid, 0, sizeof(currentCardUid));
}

void StateMachine::begin() {
    pinMode(PIN_BUZZER, OUTPUT);
    pinMode(PIN_STATUS_LED, OUTPUT);
    digitalWrite(PIN_BUZZER, LOW);
    digitalWrite(PIN_STATUS_LED, LOW);

    // Attach SG90 servo
    ESP32PWM::allocateTimer(0);
    ESP32PWM::allocateTimer(1);
    ESP32PWM::allocateTimer(2);
    ESP32PWM::allocateTimer(3);
    lockServo.setPeriodHertz(50);
    lockServo.attach(PIN_SERVO, 500, 2400);
    setServoAngle(SERVO_LOCKED_ANGLE);

    transitionTo(STATE_LOCKED, 0);
}

void StateMachine::setServoAngle(int angle) {
    servoAngle = angle;
    lockServo.write(angle);
}

const char* StateMachine::getStateString() const {
    switch (currentState) {
        case STATE_UNLOCKED: return "UNLOCKED";
        case STATE_OTP_PENDING: return "OTP_PENDING";
        case STATE_ALARM: return "ALARM";
        case STATE_LOCKOUT: return "LOCKOUT";
        case STATE_PIN_PENDING:
        case STATE_LOCKED:
        default: return "LOCKED";
    }
}

uint16_t StateMachine::getLockoutRemainingSec() const {
    if (currentState != STATE_LOCKOUT) return 0;
    VaultConfig cfg = storage.getConfig();
    unsigned long elapsed = (millis() - lockoutStartMs) / 1000;
    if (elapsed >= cfg.lockoutSec) return 0;
    return cfg.lockoutSec - elapsed;
}

uint16_t StateMachine::getOtpRemainingSec() const {
    if (currentState != STATE_OTP_PENDING) return 0;
    VaultConfig cfg = storage.getConfig();
    unsigned long elapsed = (millis() - otpIssuedMs) / 1000;
    if (elapsed >= cfg.otpTtlSec) return 0;
    return cfg.otpTtlSec - elapsed;
}

void StateMachine::transitionTo(VaultState newState, uint8_t stage) {
    currentState = newState;
    currentStage = stage;
    webServer.broadcastState();
}

void StateMachine::beep(int ms) {
    digitalWrite(PIN_BUZZER, HIGH);
    digitalWrite(PIN_STATUS_LED, HIGH);
    delay(ms);
    digitalWrite(PIN_BUZZER, LOW);
    digitalWrite(PIN_STATUS_LED, LOW);
}

void StateMachine::onCardScanned(const char* uid) {
    if (!uid) return;

    if (currentState == STATE_LOCKOUT) {
        webServer.broadcastEvent("RFID_FAIL", "Card scanned during active lockout cooldown. Denied.", uid, 0, "Blocked");
        beep(100);
        return;
    }

    if (enrollMode) {
        enrollMode = false;
        bool added = storage.addCard(uid, "Enrolled Card");
        if (added) {
            webServer.broadcastEvent("RFID_OK", "New RFID card UID registered successfully.", uid, 0, "Success");
            beep(250);
        } else {
            webServer.broadcastEvent("RFID_FAIL", "Card already registered or memory full.", uid, 0, "Failed");
            beep(100);
        }
        return;
    }

    if (storage.isCardRegistered(uid)) {
        strncpy(currentCardUid, uid, sizeof(currentCardUid) - 1);
        keypadIdx = 0;
        memset(keypadBuffer, 0, sizeof(keypadBuffer));
        stageTimeoutMs = millis();

        transitionTo(STATE_PIN_PENDING, 1);
        webServer.broadcastEvent("RFID_OK", "Authorized card detected. Enter Keypad PIN.", uid, 1, "Success");
        beep(150);
    } else {
        handleFailure("RFID_FAIL", "Unrecognized RFID card UID scanned.");
    }
}

void StateMachine::onKeypadChar(char key) {
    if (currentState == STATE_LOCKOUT) return;

    // Reset buffer on '*'
    if (key == '*') {
        keypadIdx = 0;
        memset(keypadBuffer, 0, sizeof(keypadBuffer));
        beep(50);
        return;
    }

    // Submit buffer on '#'
    if (key == '#') {
        if (currentState == STATE_PIN_PENDING) {
            if (storage.verifyPin(keypadBuffer)) {
                keypadIdx = 0;
                memset(keypadBuffer, 0, sizeof(keypadBuffer));
                generateOtp();
                transitionTo(STATE_OTP_PENDING, 2);
                webServer.broadcastEvent("PIN_OK", "PIN code verified. Dynamic OTP issued to dashboard.", nullptr, 2, "Success");
                beep(200);
            } else {
                keypadIdx = 0;
                memset(keypadBuffer, 0, sizeof(keypadBuffer));
                handleFailure("PIN_FAIL", "Incorrect PIN entered on 4x4 keypad.");
            }
        } 
        else if (currentState == STATE_OTP_PENDING) {
            if (strcmp(keypadBuffer, activeOtp) == 0) {
                keypadIdx = 0;
                memset(keypadBuffer, 0, sizeof(keypadBuffer));
                memset(activeOtp, 0, sizeof(activeOtp));

                failedAttempts = 0;
                unlockTimeMs = millis();
                setServoAngle(SERVO_UNLOCKED_ANGLE);
                transitionTo(STATE_UNLOCKED, 4);

                webServer.broadcastEvent("OTP_OK", "OTP verified. Servo unlatched to 90 degrees.", nullptr, 3, "Success");
                webServer.broadcastEvent("UNLOCKED", "Locker unlocked. Physical access granted.", nullptr, 4, "Success");
                
                // Play unlock chime
                beep(150);
                delay(80);
                beep(250);
            } else {
                keypadIdx = 0;
                memset(keypadBuffer, 0, sizeof(keypadBuffer));
                handleFailure("OTP_FAIL", "Invalid OTP entered on 4x4 keypad.");
            }
        }
        return;
    }

    // Number keys '0'-'9'
    if (key >= '0' && key <= '9') {
        if (keypadIdx < sizeof(keypadBuffer) - 1) {
            keypadBuffer[keypadIdx++] = key;
            keypadBuffer[keypadIdx] = '\0';
            stageTimeoutMs = millis(); // Refresh interaction timer
            beep(30); // Key click tone
        }
    }
}

void StateMachine::generateOtp() {
    uint32_t randomNum = esp_random() % 900000 + 100000;
    snprintf(activeOtp, sizeof(activeOtp), "%06u", randomNum);
    otpIssuedMs = millis();

    VaultConfig cfg = storage.getConfig();
    webServer.broadcastOtp(activeOtp, cfg.otpTtlSec);
    webServer.broadcastEvent("OTP_ISSUED", "6-digit OTP dispatched to connected dashboard.", nullptr, 2, "Success");
}

void StateMachine::onTamperDetected() {
    VaultConfig cfg = storage.getConfig();
    if (!cfg.armed) return;

    if (currentState != STATE_ALARM) {
        setServoAngle(SERVO_LOCKED_ANGLE); // Force safe lock
        transitionTo(STATE_ALARM, 0);
        webServer.broadcastEvent("TAMPER", "Perimeter sensor triggered! Motion/vibration detected while armed.", nullptr, 0, "Tamper");
    }
}

void StateMachine::handleFailure(const char* kind, const char* detail) {
    failedAttempts++;
    beep(80);
    delay(60);
    beep(120);

    VaultConfig cfg = storage.getConfig();
    webServer.broadcastEvent(kind, detail, currentCardUid, currentStage, "Failed");

    if (failedAttempts >= cfg.maxAttempts) {
        triggerLockout();
    } else {
        transitionTo(STATE_LOCKED, 0);
    }
}

void StateMachine::triggerLockout() {
    lockoutStartMs = millis();
    transitionTo(STATE_LOCKOUT, 0);

    VaultConfig cfg = storage.getConfig();
    webServer.broadcastEvent("LOCKOUT", "Threshold exceeded. Keypad locked down and buzzer engaged.", nullptr, 0, "Blocked");

    beep(400);
}

void StateMachine::lockNow() {
    setServoAngle(SERVO_LOCKED_ANGLE);
    transitionTo(STATE_LOCKED, 0);
    webServer.broadcastEvent("RELOCKED", "Manual 'Lock Now' command executed from dashboard.", nullptr, 0, "Success");
    beep(150);
}

void StateMachine::silenceAlarm() {
    if (currentState == STATE_ALARM) {
        digitalWrite(PIN_BUZZER, LOW);
        webServer.broadcastEvent("RELOCKED", "Alarm buzzer silenced by operator.", nullptr, 0, "Success");
    }
}

void StateMachine::resetAlarm() {
    digitalWrite(PIN_BUZZER, LOW);
    digitalWrite(PIN_STATUS_LED, LOW);
    failedAttempts = 0;
    transitionTo(STATE_LOCKED, 0);
    webServer.broadcastEvent("RELOCKED", "Alarm reset. Normal stand-by posture restored.", nullptr, 0, "Success");
    beep(200);
}

void StateMachine::startCardEnrollment() {
    enrollMode = true;
    webServer.broadcastEvent("RFID_OK", "Enrollment mode active. Tap new card to register UID.", nullptr, 0, "Success");
    beep(100);
}

void StateMachine::cancelCardEnrollment() {
    enrollMode = false;
}

void StateMachine::update() {
    unsigned long now = millis();

    // 1. Check Keypad Inactivity Timeout (15 seconds)
    if (currentState == STATE_PIN_PENDING) {
        if (now - stageTimeoutMs > KEYPAD_INPUT_TIMEOUT_MS) {
            transitionTo(STATE_LOCKED, 0);
            webServer.broadcastEvent("PIN_FAIL", "Keypad PIN input timed out.", nullptr, 1, "Failed");
        }
    }

    // 2. Check OTP TTL Expiration
    if (currentState == STATE_OTP_PENDING) {
        VaultConfig cfg = storage.getConfig();
        if (now - otpIssuedMs > (cfg.otpTtlSec * 1000UL)) {
            memset(activeOtp, 0, sizeof(activeOtp));
            handleFailure("OTP_FAIL", "OTP lifetime expired without entry.");
        }
    }

    // 3. Check Auto-Relock Timer (10 seconds)
    if (currentState == STATE_UNLOCKED) {
        if (now - unlockTimeMs > (AUTO_RELOCK_SEC * 1000UL)) {
            setServoAngle(SERVO_LOCKED_ANGLE);
            transitionTo(STATE_LOCKED, 0);
            webServer.broadcastEvent("RELOCKED", "Auto-relock timer expired (10s). Latch secured.", nullptr, 0, "Success");
            beep(150);
        }
    }

    // 4. Check Lockout Duration
    if (currentState == STATE_LOCKOUT) {
        VaultConfig cfg = storage.getConfig();
        if (now - lockoutStartMs > (cfg.lockoutSec * 1000UL)) {
            failedAttempts = 0;
            transitionTo(STATE_LOCKED, 0);
            webServer.broadcastEvent("RELOCKED", "Lockout cooldown window completed. System ready.", nullptr, 0, "Success");
            beep(200);
        }
    }

    // 5. Alarm Siren Modulation
    if (currentState == STATE_ALARM) {
        if (now - alarmBuzzerToggleMs > 250) {
            alarmBuzzerToggleMs = now;
            buzzerState = !buzzerState;
            digitalWrite(PIN_BUZZER, buzzerState ? HIGH : LOW);
            digitalWrite(PIN_STATUS_LED, buzzerState ? HIGH : LOW);
        }
    }
}
