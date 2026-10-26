# SecureVault — Hardware-Enforced Layered Physical Security Locker
### Designed & Engineered by **TEAM FIGHT CLUB**

![SecureVault Team Branding](https://img.shields.io/badge/Team-FIGHT%20CLUB-f43f5e?style=for-the-badge&logo=shield)
![Platform](https://img.shields.io/badge/Platform-ESP32%20DevKit%20V1-orange?style=for-the-badge)
![Firmware](https://img.shields.io/badge/Firmware-PlatformIO%20%7C%20Arduino-blue?style=for-the-badge)
![Frontend](https://img.shields.io/badge/Frontend-React%20%7C%20Vite%20%7C%20Tailwind-purple?style=for-the-badge)
![Security](https://img.shields.io/badge/Security-Zero%20Remote%20Unlock-emerald?style=for-the-badge)

---

## 1. Project Overview

**SecureVault** is an uncompromising physical security locker system developed by **TEAM FIGHT CLUB**. It enforces physical presence through a strict, multi-layered zero-trust pipeline before energizing the mechanical latch servo.

### The 4-Stage Zero-Trust Verification Pipeline
```
[ Stage 1: Registered RFID Tag ] ──> [ Stage 2: 4x4 Keypad PIN ] ──> [ Stage 3: Hardware OTP ] ──> [ Stage 4: 90° Servo Actuation ]
          │                                   │                                  │
          └── Failed: Logged                  └── Failed: Attempt +1             └── Failed: Attempt +1
                                                      │                                  │
                                                      └──────────────────────────────────┴──> [ 3x Failures: LOCKOUT + ALARM ]
```

### The Uncompromising Security Rule: **NO REMOTE UNLOCK**
> **Zero Remote Unlock Policy**: The web dashboard is engineered strictly for real-time monitoring, telemetry inspection, card enrollment, and emergency lockdown (`Lock Now`, `Silence Alarm`, `Reset Alarm`). **No API endpoint, button, or network packet can remotely unlock the vault.** Physical presence at the locker is mandatory.

---

## 2. Hardware Bill of Materials & Wiring Guide

Referenced from our project prototype specification:

| Component | Qty | Operating Voltage | Connection Type / ESP32 Pins | Notes |
| :--- | :---: | :---: | :--- | :--- |
| **ESP32 DevKit V1** | 1 | 5V via USB / VIN | Core Controller | Dual-core 240MHz, 2.4GHz Wi-Fi + BLE |
| **RC522 RFID Reader** | 1 | **3.3V ONLY** | SPI: SS=5, SCK=18, MOSI=23, MISO=19, RST=22 | **Do NOT connect to 5V** (will damage IC) |
| **4x4 Membrane Keypad** | 1 | 3.3V GPIO | Rows: 32, 33, 25, 26 <br> Cols: 27, 14, 12, 13 | High-durability matrix switch |
| **SG90 / MG90S Servo** | 1 | **External 5V** | PWM Signal: GPIO 15 | Dedicated 5V supply with **shared ESP32 GND** |
| **HC-SR501 PIR Sensor** | 1 | 5V (3.3V Out) | Signal: GPIO 34 (Input only) | Vibration or perimeter tamper detection |
| **Active Piezo Buzzer** | 1 | 3.3V / 5V | Signal: GPIO 4 | Audible alarms, lockouts, and key clicks |
| **Status LEDs (Red/Green)**| 2 | 3.3V | Signal: GPIO 2 (via 220Ω resistor) | Visual feedback indicators |

### Electrical Wiring Schematic
```
                      +-------------------+
                      |  ESP32 DevKit V1  |
                      |  TEAM FIGHT CLUB  |
                      +-------------------+
                           |   |   |   |
      [RC522 RFID]         |   |   |   |         [4x4 Keypad Matrix]
      3.3V <------------- 3V3  |   |   |
      GND  <------------- GND  |   |   |------> Rows: GPIO 32, 33, 25, 26
      SDA/SS <---------- GPIO 5|   |   |------> Cols: GPIO 27, 14, 12, 13
      SCK   <---------- GPIO 18|   |
      MOSI  <---------- GPIO 23|   |             [Actuators & Sensors]
      MISO  <---------- GPIO 19|   +----------> GPIO 15: Servo PWM (SG90)
      RST   <---------- GPIO 22|                GPIO 34: Motion/Tamper IN
                               +--------------> GPIO 4:  Active Buzzer
                                                GPIO 2:  Status Strobe LED
    
    * POWER NOTE: Servo motor VCC is wired to an external regulated 5V power supply,
      with common ground connected directly to ESP32 GND.
```

---

## 3. Directory Structure

```
secure-vault/
├── dashboard/                  # Responsive React + Vite + Tailwind PWA Dashboard
│   ├── public/                 # PWA Manifest, icons, service worker
│   ├── src/
│   │   ├── config/brand.ts     # TEAM FIGHT CLUB central branding
│   │   ├── context/            # VaultContext & state machine orchestrator
│   │   ├── services/           # MockDeviceClient & RealDeviceClient
│   │   ├── components/         # Glassmorphism widgets, Recharts, layouts
│   │   └── types/              # Shared TypeScript contracts
│   └── package.json
│
├── firmware/                   # ESP32 PlatformIO Firmware Project
│   ├── platformio.ini          # DevKit V1 configuration & library dependencies
│   ├── src/
│   │   ├── config.h            # Pinout mapping & timing thresholds
│   │   ├── secrets.h           # Wi-Fi SSID, password & API tokens
│   │   ├── storage.h/.cpp      # NVS Preferences (PIN & RFID Whitelist)
│   │   ├── state_machine.h/.cpp# Non-blocking zero-trust state machine
│   │   ├── web_server.h/.cpp   # AsyncWebServer + AsyncWebSocket + Ring Buffer
│   │   └── main.cpp            # Peripheral loops & boot banner
│
├── docs/                       # Comprehensive documentation
│   ├── README.md               # Architecture, wiring & presentation guide
│   └── api.md                  # REST & WebSocket protocol schema
└── implementation_plan.md
```

---

## 4. How to Run the Web Dashboard

### Prerequisites
- Node.js v18+ and npm

### Development Mode
```bash
cd dashboard
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser. The dashboard automatically launches in **Demo / Simulator Mode**, allowing immediate live exploration of all features.

### Production Build & PWA Preview
```bash
cd dashboard
npm run build
npm run preview
```

---

## 5. How to Flash the ESP32 Firmware

### 1. Configure Wi-Fi Credentials
Edit `firmware/src/secrets.h`:
```cpp
#define WIFI_SSID       "YourWiFiNetwork"
#define WIFI_PASSWORD   "YOUR_WIFI_PASSWORD"
#define VAULT_API_TOKEN "YOUR_LONG_RANDOM_TOKEN"
```

### 2. Build and Upload via PlatformIO
```bash
cd firmware
pio run --target upload
pio device monitor -b 115200
```
Upon boot, the ESP32 prints the **TEAM FIGHT CLUB** serial banner:
```
==================================================================
  SECUREVAULT FIRMWARE — TEAM FIGHT CLUB
  "No Unlock Without Complete Layered Verification"
  Firmware Version: 1.2.0 | ESP32 DevKit V1
==================================================================
[Storage] NVS loaded. Registered cards: 2
[RFID] MFRC522 initialized on SS pin 5
[WiFi] Connected! IP Address: 192.168.1.145
[mDNS] Hostname registered: http://securevault.local
[HTTP] REST API and WebSocket (/ws) active on port 80.
[System] SecureVault Armed and Ready.
```

If Wi-Fi fails to connect within 10 seconds, the device enters fallback SoftAP mode:
- **SSID:** `SecureVault-AP`
- **Password:** `YOUR_ACCESS_POINT_PASSWORD`
- **IP:** `192.168.4.1`

---

## 6. Live Presentation & Demo Guide

SecureVault features an **Interactive Hardware Simulator** directly built into the dashboard, enabling complete end-to-end demonstrations without physical hardware:

### Demo Scenario A: Standard Unlocking Flow
1. Open the dashboard and tap the **"Interactive Simulator"** pill button on the navbar (or floating in the bottom-right).
2. Tap **"Full Unlock Walkthrough"** (or trigger step-by-step):
   - **Step 1:** Tap `Tap Valid Tag (04:A2)`. Card UID is verified against whitelist; verification step 1 turns green.
   - **Step 2:** Enter PIN `1234` and tap `Submit PIN`. ESP32 generates a cryptographically random 6-digit OTP and pushes it live over WebSocket.
   - **Step 3:** Notice the **Live OTP display** with the animated circular countdown ring. Tap `Auto-Fill & Submit`.
   - **Step 4:** Servo sweeps to 90° (UNLOCKED state engaged). Confetti bursts on screen!
   - **Step 5:** After 10 seconds, auto-relock engages and latches the deadbolt back to 0°.

### Demo Scenario B: Attack Path & Security Lockout
1. Tap **"Fail -> Lockout Demo"** in the simulator.
2. Three consecutive incorrect PIN attempts are simulated.
3. System immediately shifts into **LOCKOUT state**:
   - Red alert banner is displayed.
   - Cooldown timer countdown begins (30 seconds).
   - Keypad entries are blocked and logged as security incidents.

### Demo Scenario C: Physical Perimeter Tamper Alert
1. While armed, tap **"Trigger Tamper"** in the simulator panel.
2. The locker detects motion/vibration:
   - System enters **ALARM** state.
   - Servo is held at 0° (fail-safe locked).
   - Audio strobe triggers.
   - Operator can tap **"Silence Alarm"** or **"Reset Alarm"** to restore stand-by posture.

---

## 7. Acceptance Criteria Verification

| Requirement | Implementation Detail | Status |
| :--- | :--- | :---: |
| **Visual Design** | Exact dark glassmorphism `#0a0608`, rounded-3xl container, magenta/orange glow, decorative sparkle stars | Verified |
| **Responsiveness** | Desktop 1440px multi-column layout $\leftrightarrow$ Mobile 390px bottom tab bar | Verified |
| **Team Branding** | `"TEAM FIGHT CLUB"` displayed on sidebar, mobile top bar, splash screen, settings footer, firmware boot banner, and `/api/state` | Verified |
| **Zero Remote Unlock** | No remote unlock button or route exists. Unlocking requires RFID + PIN + OTP at keypad. | Enforced |
| **Built-in Simulator** | `MockDeviceClient` replicates state machine, WebSocket frames, telemetry, and interactive controls | Verified |
| **Firmware Quality** | Non-blocking `millis()`, NVS storage, mDNS `securevault.local`, softAP fallback, RAM ring buffer | Verified |

---

### Project Attribution
**SECUREVAULT** is designed, engineered, and maintained by **TEAM FIGHT CLUB**.  
*Rule #1: No Unlock Without Complete Verification.*
