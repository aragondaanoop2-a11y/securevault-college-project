#pragma once
#include <Arduino.h>
#include <ESP32Servo.h>
#include "config.h"
#include "storage.h"

enum VaultState {
    STATE_LOCKED = 0,
    STATE_PIN_PENDING = 1,
    STATE_OTP_PENDING = 2,
    STATE_UNLOCKED = 3,
    STATE_ALARM = 4,
    STATE_LOCKOUT = 5
};

class StateMachine {
public:
    StateMachine();
    void begin();
    void update();

    // Hardware Event Triggers
    void onCardScanned(const char* uid);
    void onKeypadChar(char key);
    void onTamperDetected();

    // Remote / Dashboard Commands
    void lockNow();
    void silenceAlarm();
    void resetAlarm();
    void startCardEnrollment();
    void cancelCardEnrollment();

    // State getters
    VaultState getState() const { return currentState; }
    uint8_t getStage() const { return currentStage; }
    uint8_t getFailedAttempts() const { return failedAttempts; }
    uint16_t getLockoutRemainingSec() const;
    const char* getActiveOtp() const { return activeOtp; }
    uint16_t getOtpRemainingSec() const;
    bool isArmed() const { return storage.getConfig().armed; }
    int getServoAngle() const { return servoAngle; }
    bool isEnrollMode() const { return enrollMode; }

    const char* getStateString() const;

private:
    VaultState currentState;
    uint8_t currentStage; // 0 to 4
    uint8_t failedAttempts;
    
    // Actuator
    Servo lockServo;
    int servoAngle;

    // Buffers and Otp
    char keypadBuffer[10];
    uint8_t keypadIdx;
    char activeOtp[7];
    char currentCardUid[32];

    // Timers (non-blocking millis)
    unsigned long stageTimeoutMs;
    unsigned long otpIssuedMs;
    unsigned long unlockTimeMs;
    unsigned long lockoutStartMs;
    unsigned long alarmBuzzerToggleMs;
    bool buzzerState;
    bool enrollMode;

    void setServoAngle(int angle);
    void generateOtp();
    void handleFailure(const char* kind, const char* detail);
    void triggerLockout();
    void transitionTo(VaultState newState, uint8_t stage);
    void beep(int ms);
};

extern StateMachine stateMachine;
