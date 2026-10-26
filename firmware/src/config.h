#pragma once
#include "secrets.h"
#include <Arduino.h>

/**
 * ============================================================================
 * SECUREVAULT FIRMWARE CONFIGURATION
 * TEAM FIGHT CLUB — "No Unlock Without Complete Layered Verification"
 * ============================================================================
 */

#ifndef TEAM_NAME
#define TEAM_NAME "TEAM FIGHT CLUB"
#endif

#ifndef FW_VERSION
#define FW_VERSION "1.2.0"
#endif

// mDNS hostname -> http://securevault.local
#define MDNS_HOSTNAME "securevault"

// ======================== HARDWARE PIN DEFINITIONS ========================
// SPI RFID (RC522) - Powered via 3.3V ONLY
#define PIN_RFID_SS     5
#define PIN_RFID_RST    22
#define PIN_RFID_SCK    18
#define PIN_RFID_MOSI   23
#define PIN_RFID_MISO   19

// 4x4 Membrane Keypad
#define KEYPAD_ROWS     4
#define KEYPAD_COLS     4
#define PIN_KEYPAD_R1   32
#define PIN_KEYPAD_R2   33
#define PIN_KEYPAD_R3   25
#define PIN_KEYPAD_R4   26

#define PIN_KEYPAD_C1   27
#define PIN_KEYPAD_C2   14
#define PIN_KEYPAD_C3   12
#define PIN_KEYPAD_C4   13

// Actuator & Sensors
#define PIN_SERVO       15  // SG90/MG90S signal (5V external power recommended)
#define PIN_PIR_MOTION  34  // HC-SR501 or tilt/vibration (Input only)
#define PIN_BUZZER      4   // Active Piezo Buzzer
#define PIN_STATUS_LED  2   // Onboard / External Status LED

// ======================== TIMING & DEFAULTS ===============================

#define DEFAULT_MAX_ATTEMPTS    3
#define DEFAULT_LOCKOUT_SEC     30
#define DEFAULT_OTP_TTL_SEC     60
#define AUTO_RELOCK_SEC         10
#define KEYPAD_INPUT_TIMEOUT_MS 15000

// Servo angles
#define SERVO_LOCKED_ANGLE      0
#define SERVO_UNLOCKED_ANGLE    90

// Security Tokens & Auth
#define VAULT_TOKEN_HEADER      "X-Vault-Token"

#define RING_BUFFER_MAX_EVENTS  100
