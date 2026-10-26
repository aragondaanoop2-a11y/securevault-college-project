#include "SecureVault_Demo.secrets.h"
#include <WiFi.h>
#include <WebServer.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Keypad.h>
#include <ESP32Servo.h>
#include <esp_system.h>

// Standalone classroom demo: the ESP32 hosts its own Wi-Fi network and dashboard.
// Change the registered UID after reading your RFID card in Serial Monitor.





constexpr byte RFID_SS_PIN = 5;
constexpr byte RFID_RST_PIN = 22;
constexpr byte SERVO_PIN = 17;
constexpr byte BUZZER_PIN = 16;
constexpr byte TAMPER_PIN = 34;  // PIR OUT or a 3.3 V-safe tamper signal

constexpr int SERVO_LOCKED_ANGLE = 0;
constexpr int SERVO_UNLOCKED_ANGLE = 90;
constexpr unsigned long OTP_LIFETIME_MS = 60000;
constexpr unsigned long UNLOCK_TIME_MS = 5000;
constexpr unsigned long LOCKOUT_TIME_MS = 30000;
constexpr unsigned long TAMPER_CLEAR_TIME_MS = 3000;
constexpr unsigned long SIMULATED_TAMPER_TIME_MS = 5000;
constexpr byte MAX_FAILURES = 3;
constexpr byte EVENT_CAPACITY = 10;

const byte ROWS = 4;
const byte COLS = 4;
char keyMap[ROWS][COLS] = {
    {'1', '2', '3', 'A'},
    {'4', '5', '6', 'B'},
    {'7', '8', '9', 'C'},
    {'*', '0', '#', 'D'}};
byte rowPins[ROWS] = {13, 14, 27, 26};
byte colPins[COLS] = {25, 33, 32, 21};

enum DeviceState { WAITING_FOR_CARD, WAITING_FOR_PIN, WAITING_FOR_OTP, BOX_UNLOCKED, LOCKED_OUT, ALARM };

WebServer server(80);
MFRC522 rfid(RFID_SS_PIN, RFID_RST_PIN);
Keypad keypad = Keypad(makeKeymap(keyMap), rowPins, colPins, ROWS, COLS);
Servo latchServo;

DeviceState state = WAITING_FOR_CARD;
String pinBuffer;
String otpBuffer;
String currentOtp;
String currentMessage = "Tap your registered RFID card.";
String events[EVENT_CAPACITY];
byte eventHead = 0;
byte eventCount = 0;
byte failedAttempts = 0;
bool buzzerOn = false;
bool tamperLatched = false;
bool simulatedTamper = false;
unsigned long otpExpiresAt = 0;
unsigned long unlockExpiresAt = 0;
unsigned long lockoutExpiresAt = 0;
unsigned long buzzerExpiresAt = 0;
unsigned long tamperClearStartedAt = 0;
unsigned long simulatedTamperExpiresAt = 0;

const char DASHBOARD[] PROGMEM = R"rawliteral(
<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SecureVault Demo</title><style>
body{font-family:Arial,sans-serif;background:#edf2f7;color:#17243a;margin:0;padding:20px}
main{max-width:680px;margin:auto}h1{margin-bottom:4px}.muted{color:#5d6b7f}
section{background:white;border-radius:12px;padding:18px;margin:14px 0;box-shadow:0 2px 10px #17243a12}
#state{font-size:1.5rem;font-weight:bold}.otp{font-size:2rem;letter-spacing:.2em;color:#087e8b}
button{padding:12px 16px;border:0;border-radius:8px;background:#087e8b;color:white;font-size:1rem}
li{margin:8px 0}.warning{font-size:.9rem;color:#7b4c00}
</style></head><body><main><h1>SecureVault</h1>
<div class="muted">Local prototype dashboard - connect to the ESP32 Wi-Fi first.</div>
<section><div class="muted">BOX STATUS</div><div id="state">Connecting...</div><p id="message"></p>
<div id="otpBox" hidden><div class="muted">DEMO OTP - enter this on the physical keypad</div><div id="otp" class="otp"></div></div></section>
<section><h2>Access history</h2><ul id="events"><li>Waiting for events...</li></ul></section>
<section><h2>Prototype test</h2><button onclick="simulateTamper()">Simulate tamper alert</button>
<p class="warning">This button triggers an alarm test only; it does not unlock the box.</p></section>
<p class="warning">Demo only: the OTP is displayed here instead of being sent privately to a phone.</p>
</main><script>
async function refresh(){try{const r=await fetch('/api/status');const d=await r.json();
document.getElementById('state').textContent=d.state;
document.getElementById('message').textContent=d.message;
const box=document.getElementById('otpBox');box.hidden=!d.demoOtp;
document.getElementById('otp').textContent=d.demoOtp||'';
const list=document.getElementById('events');list.innerHTML='';
if(!d.events.length){list.innerHTML='<li>No events yet</li>';}
for(const e of d.events){const li=document.createElement('li');li.textContent=e;list.appendChild(li);}
}catch(e){document.getElementById('state').textContent='ESP32 not reachable';}}
async function simulateTamper(){await fetch('/api/demo/tamper',{method:'POST'});refresh();}
refresh();setInterval(refresh,1000);
</script></body></html>)rawliteral";

String stateName() {
  switch (state) {
    case WAITING_FOR_CARD: return "LOCKED - WAITING FOR RFID";
    case WAITING_FOR_PIN: return "RFID ACCEPTED - ENTER PIN";
    case WAITING_FOR_OTP: return "PIN ACCEPTED - OTP REQUIRED";
    case BOX_UNLOCKED: return "UNLOCKED";
    case LOCKED_OUT: return "TEMPORARY LOCKOUT";
    case ALARM: return "ALARM - BOX LOCKED";
  }
  return "UNKNOWN";
}

String jsonEscape(const String &value) {
  String escaped;
  for (size_t i = 0; i < value.length(); ++i) {
    char c = value[i];
    if (c == '"' || c == '\\') escaped += '\\';
    if (c == '\n') escaped += "\\n";
    else if (c != '\r') escaped += c;
  }
  return escaped;
}

String uptimeStamp() {
  unsigned long seconds = millis() / 1000UL;
  unsigned long hours = seconds / 3600UL;
  unsigned long minutes = (seconds % 3600UL) / 60UL;
  seconds %= 60UL;
  char stamp[24];
  snprintf(stamp, sizeof(stamp), "%02lu:%02lu:%02lu", hours, minutes, seconds);
  return String(stamp);
}

void addEvent(const String &description) {
  events[eventHead] = uptimeStamp() + " - " + description;
  eventHead = (eventHead + 1) % EVENT_CAPACITY;
  if (eventCount < EVENT_CAPACITY) ++eventCount;
  Serial.println(events[(eventHead + EVENT_CAPACITY - 1) % EVENT_CAPACITY]);
}

void startBeep(unsigned long durationMs) {
  digitalWrite(BUZZER_PIN, HIGH);  // Assumes an active-high active buzzer module.
  buzzerOn = true;
  buzzerExpiresAt = millis() + durationMs;
}

void stopBeep() {
  digitalWrite(BUZZER_PIN, LOW);
  buzzerOn = false;
}

void lockBox() {
  latchServo.write(SERVO_LOCKED_ANGLE);
}

void clearCredentials() {
  pinBuffer = "";
  otpBuffer = "";
  currentOtp = "";
  otpExpiresAt = 0;
}

void registerFailure(const String &reason) {
  ++failedAttempts;
  addEvent(reason + " (" + String(failedAttempts) + "/" + String(MAX_FAILURES) + ")");
  currentMessage = reason + ". Try again.";
  startBeep(180);
  if (failedAttempts >= MAX_FAILURES) {
    state = LOCKED_OUT;
    lockoutExpiresAt = millis() + LOCKOUT_TIME_MS;
    clearCredentials();
    currentMessage = "Three failures. Wait 30 seconds before trying again.";
    addEvent("Temporary lockout started");
  }
}

String readCardUid() {
  String uid;
  for (byte i = 0; i < rfid.uid.size; ++i) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
    if (i + 1 < rfid.uid.size) uid += " ";
  }
  uid.toUpperCase();
  return uid;
}

void handleCard() {
  if (state != WAITING_FOR_CARD) return;
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) return;

  String uid = readCardUid();
  Serial.println("Scanned RFID UID: " + uid);
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();

  if (uid == REGISTERED_UID) {
    state = WAITING_FOR_PIN;
    currentMessage = "Card accepted. Enter the PIN on the keypad, then press #.";
    pinBuffer = "";
    addEvent("Registered RFID card accepted");
  } else {
    registerFailure("Unregistered RFID card");
  }
}

void createDemoOtp() {
  uint32_t randomValue = esp_random();
  currentOtp = String(100000UL + (randomValue % 900000UL));
  otpExpiresAt = millis() + OTP_LIFETIME_MS;
  state = WAITING_FOR_OTP;
  currentMessage = "PIN accepted. Enter the demo OTP shown on this dashboard, then press #.";
  addEvent("PIN accepted; demo OTP generated (valid for 60 seconds)");
}

void unlockBox() {
  state = BOX_UNLOCKED;
  latchServo.write(SERVO_UNLOCKED_ANGLE);
  unlockExpiresAt = millis() + UNLOCK_TIME_MS;
  currentMessage = "All demo checks passed. The servo will relock in 5 seconds.";
  failedAttempts = 0;
  clearCredentials();
  addEvent("Access granted; servo unlocked");
  startBeep(100);
}

void submitPin() {
  if (pinBuffer == DEMO_PIN) {
    pinBuffer = "";
    createDemoOtp();
  } else {
    pinBuffer = "";
    registerFailure("Incorrect PIN");
  }
}

void submitOtp() {
  if ((long)(millis() - otpExpiresAt) >= 0) {
    clearCredentials();
    state = WAITING_FOR_CARD;
    currentMessage = "OTP expired. Tap your registered card to start again.";
    addEvent("OTP expired");
    return;
  }
  if (otpBuffer == currentOtp) {
    unlockBox();
  } else {
    otpBuffer = "";
    registerFailure("Incorrect OTP");
  }
}

void handleKeypad() {
  char key = keypad.getKey();
  if (!key || (state != WAITING_FOR_PIN && state != WAITING_FOR_OTP)) return;

  String &buffer = (state == WAITING_FOR_PIN) ? pinBuffer : otpBuffer;
  if (key == '*') {
    buffer = "";
    currentMessage = "Entry cleared. Type the code and press #.";
  } else if (key == '#') {
    if (state == WAITING_FOR_PIN) submitPin();
    else submitOtp();
  } else if (key >= '0' && key <= '9' && buffer.length() < 6) {
    buffer += key;
    currentMessage = "Code entered: " + String(buffer.length()) + " digit(s). Press # to submit.";
  }
}

bool tamperIsActive() {
  return simulatedTamper || digitalRead(TAMPER_PIN) == HIGH;
}

void handleTamper() {
  bool active = tamperIsActive();
  if (active && state != BOX_UNLOCKED) {
    tamperClearStartedAt = 0;
    if (!tamperLatched) {
      tamperLatched = true;
      state = ALARM;
      clearCredentials();
      lockBox();
      currentMessage = "Motion/tamper signal detected. The box remains locked.";
      addEvent("Tamper or motion detected; box kept locked");
      startBeep(1200);
    }
    return;
  }

  if (tamperLatched && !active) {
    if (tamperClearStartedAt == 0) tamperClearStartedAt = millis();
    if (millis() - tamperClearStartedAt >= TAMPER_CLEAR_TIME_MS) {
      tamperLatched = false;
      tamperClearStartedAt = 0;
      if (state == ALARM) {
        state = WAITING_FOR_CARD;
        currentMessage = "Alarm cleared. Tap your registered RFID card.";
      }
      addEvent("Tamper signal cleared; box remains locked");
    }
  }
}

void handleStatus() {
  String json = "{\"state\":\"" + jsonEscape(stateName()) + "\",\"message\":\"" +
                jsonEscape(currentMessage) + "\",\"demoOtp\":\"";
  if (state == WAITING_FOR_OTP) json += currentOtp;
  json += "\",\"events\":[";
  for (byte i = 0; i < eventCount; ++i) {
    byte index = (eventHead + EVENT_CAPACITY - 1 - i) % EVENT_CAPACITY;
    if (i) json += ",";
    json += "\"" + jsonEscape(events[index]) + "\"";
  }
  json += "]}";
  server.send(200, "application/json", json);
}

void handleSimulatedTamper() {
  simulatedTamper = true;
  simulatedTamperExpiresAt = millis() + SIMULATED_TAMPER_TIME_MS;
  server.send(200, "application/json", "{\"ok\":true}");
}

void setupWebServer() {
  server.on("/", HTTP_GET, []() { server.send_P(200, "text/html", DASHBOARD); });
  server.on("/api/status", HTTP_GET, handleStatus);
  server.on("/api/demo/tamper", HTTP_POST, handleSimulatedTamper);
  server.onNotFound([]() { server.send(404, "text/plain", "Not found"); });
  server.begin();
}

void setup() {
  Serial.begin(115200);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(TAMPER_PIN, INPUT);
  digitalWrite(BUZZER_PIN, LOW);

  latchServo.setPeriodHertz(50);
  latchServo.attach(SERVO_PIN, 500, 2400);
  lockBox();

  SPI.begin(18, 19, 23, RFID_SS_PIN);
  rfid.PCD_Init();
  delay(50);

  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASSWORD);
  setupWebServer();

  addEvent("SecureVault started and locked");
  Serial.println("SecureVault demo ready.");
  Serial.print("Connect phone to Wi-Fi: ");
  Serial.println(AP_SSID);
  Serial.print("Wi-Fi password: ");
  Serial.print("Open dashboard: http://");
  Serial.println(WiFi.softAPIP());
  Serial.println("Tap an RFID card to read its UID. Set REGISTERED_UID to the intended card.");
}

void loop() {
  server.handleClient();
  handleTamper();
  handleCard();
  handleKeypad();

  if (simulatedTamper && (long)(millis() - simulatedTamperExpiresAt) >= 0) {
    simulatedTamper = false;
  }

  if (state == WAITING_FOR_OTP && (long)(millis() - otpExpiresAt) >= 0) {
    clearCredentials();
    state = WAITING_FOR_CARD;
    currentMessage = "OTP expired. Tap your registered card to start again.";
    addEvent("OTP expired");
  }

  if (state == BOX_UNLOCKED && (long)(millis() - unlockExpiresAt) >= 0) {
    lockBox();
    state = WAITING_FOR_CARD;
    currentMessage = "Box relocked. Tap your registered RFID card.";
    addEvent("Servo relocked the box");
  }

  if (state == LOCKED_OUT && (long)(millis() - lockoutExpiresAt) >= 0) {
    state = WAITING_FOR_CARD;
    currentMessage = "Lockout ended. Tap your registered RFID card.";
    addEvent("Temporary lockout ended");
  }

  if (buzzerOn && (long)(millis() - buzzerExpiresAt) >= 0) stopBeep();
  delay(2);
}
