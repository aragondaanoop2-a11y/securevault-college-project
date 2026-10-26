#include <Arduino.h>
#include <WiFi.h>
#include <ESPmDNS.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Keypad.h>

#include "config.h"
#include "secrets.h"
#include "storage.h"
#include "state_machine.h"
#include "web_server.h"

// ======================== HARDWARE PERIPHERALS ============================
// RFID MFRC522
MFRC522 rfid(PIN_RFID_SS, PIN_RFID_RST);

// 4x4 Keypad Mapping
const byte ROWS = KEYPAD_ROWS;
const byte COLS = KEYPAD_COLS;
char keys[ROWS][COLS] = {
    {'1', '2', '3', 'A'},
    {'4', '5', '6', 'B'},
    {'7', '8', '9', 'C'},
    {'*', '0', '#', 'D'}
};
byte rowPins[ROWS] = {PIN_KEYPAD_R1, PIN_KEYPAD_R2, PIN_KEYPAD_R3, PIN_KEYPAD_R4};
byte colPins[COLS] = {PIN_KEYPAD_C1, PIN_KEYPAD_C2, PIN_KEYPAD_C3, PIN_KEYPAD_C4};
Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

// Motion Sensor State
unsigned long lastMotionCheckMs = 0;

void printBootBanner() {
    Serial.println("\n");
    Serial.println("==================================================================");
    Serial.println("  SECUREVAULT FIRMWARE — " TEAM_NAME);
    Serial.println("  \"No Unlock Without Complete Layered Verification\"");
    Serial.println("  Firmware Version: " FW_VERSION " | ESP32 DevKit V1");
    Serial.println("==================================================================");
}

void connectNetwork() {
    Serial.printf("[WiFi] Attempting connection to SSID: %s ...\n", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    unsigned long startMs = millis();
    bool connected = false;

    while (millis() - startMs < 10000) {
        if (WiFi.status() == WL_CONNECTED) {
            connected = true;
            break;
        }
        delay(250);
        Serial.print(".");
    }
    Serial.println();

    if (connected) {
        Serial.printf("[WiFi] Connected! IP Address: %s\n", WiFi.localIP().toString().c_str());
        Serial.printf("[WiFi] RSSI Signal: %d dBm\n", WiFi.RSSI());
    } else {
        Serial.println("[WiFi] Connection timeout. Launching Fallback SoftAP mode...");
        WiFi.mode(WIFI_AP);
        WiFi.softAP(AP_SSID, AP_PASSWORD);
        Serial.printf("[WiFi] SoftAP active! SSID: %s | IP: %s\n", AP_SSID, WiFi.softAPIP().toString().c_str());
    }

    // Start mDNS resolver: http://securevault.local
    if (MDNS.begin(MDNS_HOSTNAME)) {
        Serial.printf("[mDNS] Hostname registered: http://%s.local\n", MDNS_HOSTNAME);
        MDNS.addService("http", "tcp", 80);
    }
}

void setup() {
    Serial.begin(115200);
    delay(200);
    printBootBanner();

    // 1. Initialize NVS Storage
    if (!storage.begin()) {
        Serial.println("[Storage] Failed to initialize NVS preferences!");
    } else {
        Serial.printf("[Storage] NVS loaded. Registered cards: %d\n", storage.getCardCount());
    }

    // 2. Initialize State Machine & Actuators
    stateMachine.begin();

    // 3. Initialize Motion / PIR Tamper Pin
    pinMode(PIN_PIR_MOTION, INPUT);

    // 4. Initialize SPI & MFRC522 RFID
    SPI.begin(PIN_RFID_SCK, PIN_RFID_MISO, PIN_RFID_MOSI, PIN_RFID_SS);
    rfid.PCD_Init();
    Serial.printf("[RFID] MFRC522 initialized on SS pin %d\n", PIN_RFID_SS);

    // 5. Connect to Wi-Fi / Fallback AP & mDNS
    connectNetwork();

    // 6. Start WebServer & WebSocket
    webServer.begin();
    Serial.println("[HTTP] REST API and WebSocket (/ws) active on port 80.");
    Serial.println("[System] SecureVault Armed and Ready.");
}

void loop() {
    // Non-blocking state machine update
    stateMachine.update();

    // WebServer & WebSocket client housekeeping
    webServer.update();

    // 1. Scan for RFID Cards
    if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
        char uidBuffer[32];
        snprintf(uidBuffer, sizeof(uidBuffer), "%02X:%02X:%02X:%02X",
                 rfid.uid.uidByte[0], rfid.uid.uidByte[1],
                 rfid.uid.uidByte[2], rfid.uid.uidByte[3]);

        Serial.printf("[RFID] Card UID Scanned: %s\n", uidBuffer);
        stateMachine.onCardScanned(uidBuffer);

        rfid.PICC_HaltA();
        rfid.PCD_StopCrypto1();
    }

    // 2. Read 4x4 Matrix Keypad
    char key = keypad.getKey();
    if (key != NO_KEY) {
        Serial.printf("[Keypad] Key Pressed: %c\n", key);
        stateMachine.onKeypadChar(key);
    }

    // 3. Check Motion / PIR Tamper Sensor
    if (millis() - lastMotionCheckMs > 200) {
        lastMotionCheckMs = millis();
        if (digitalRead(PIN_PIR_MOTION) == HIGH) {
            stateMachine.onTamperDetected();
        }
    }
}
