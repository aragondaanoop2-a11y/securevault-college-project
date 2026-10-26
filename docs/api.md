# SecureVault API & Device Transport Specification
**TEAM FIGHT CLUB** — Hardware-Enforced Layered Physical Security  
Version: `1.2.0` | Target Architecture: ESP32 + Web Dashboard

---

## 1. Transport Overview

The SecureVault system relies on a hybrid local network transport:
- **WebSocket (`ws://<ip-or-host>/ws`)**: High-frequency bi-directional telemetry and asynchronous hardware push events (RFID scan, keypad entry, dynamic OTP dispatch, tamper detection, state changes).
- **REST API (`http://<ip-or-host>/api/*`)**: Idempotent configuration management, logs retrieval, card whitelist CRUD, and operator commands (lock now, silence alarm, reset alarm).

### Authentication & Headers
All REST mutating endpoints require a custom pre-shared authentication header:
```http
X-Vault-Token: YOUR_VAULT_API_TOKEN
```
Requests lacking this token receive `401 Unauthorized`. CORS headers (`Access-Control-Allow-Origin: *`) are enabled on all routes.

---

## 2. WebSocket Protocol (`/ws`)

Upon establishing a connection to `/ws`, the ESP32 registers the client and automatically broadcasts the initial state and hardware telemetry.

### ESP32 $\to$ Dashboard Messages

#### A. System State Payload
Dispatched upon every state machine transition:
```json
{
  "type": "state",
  "state": "LOCKED",
  "stage": 0,
  "failedAttempts": 0,
  "lockoutRemainingSec": 0,
  "armed": true,
  "team": "TEAM FIGHT CLUB"
}
```
- `state`: `"LOCKED"` | `"OTP_PENDING"` | `"UNLOCKED"` | `"ALARM"` | `"LOCKOUT"`
- `stage`: `0` (Idle/Locked), `1` (RFID verified), `2` (PIN verified), `3` (OTP verified), `4` (Servo unlatched)
- `failedAttempts`: Current consecutive failure tally
- `lockoutRemainingSec`: Remaining lockout cooldown countdown in seconds
- `armed`: Motion/tamper perimeter status
- `team`: Constant string `"TEAM FIGHT CLUB"`

#### B. Audit Event Payload
Dispatched immediately when an authentication or perimeter action occurs:
```json
{
  "type": "event",
  "ts": 1697801234567,
  "kind": "RFID_OK",
  "uid": "04:A2:3B:89",
  "stage": 1,
  "result": "Success",
  "detail": "Authorized card detected. Enter Keypad PIN."
}
```
Valid `kind` values:
- `RFID_OK`: Enrolled RFID tag presented
- `RFID_FAIL`: Unknown RFID tag presented
- `PIN_OK`: Master PIN matches
- `PIN_FAIL`: Incorrect keypad PIN
- `OTP_ISSUED`: Hardware-generated OTP dispatched to client
- `OTP_OK`: 6-digit OTP verified on keypad
- `OTP_FAIL`: Incorrect or expired OTP
- `UNLOCKED`: Servo rotated to 90°
- `RELOCKED`: Latch locked to 0°
- `LOCKOUT`: Cooldown threshold triggered
- `TAMPER`: Motion/tilt sensor triggered while armed

Valid `result` values: `"Success"` | `"Failed"` | `"Blocked"` | `"Tamper"`

#### C. Dynamic One-Time Password (OTP) Payload
Dispatched **only** when transitioning to `OTP_PENDING` (Stage 2):
```json
{
  "type": "otp",
  "code": "849201",
  "expiresInSec": 60
}
```

#### D. Telemetry Heartbeat Payload
Dispatched periodically (every 2–3 seconds):
```json
{
  "type": "telemetry",
  "rssi": -58,
  "uptimeSec": 4320,
  "heap": 184520,
  "servoAngle": 0
}
```

---

## 3. REST API Specification

### 1. Retrieve Current System State
- **Method:** `GET`
- **Route:** `/api/state`
- **Auth Required:** No
- **Response `200 OK`:**
```json
{
  "type": "state",
  "state": "LOCKED",
  "stage": 0,
  "failedAttempts": 0,
  "lockoutRemainingSec": 0,
  "armed": true,
  "team": "TEAM FIGHT CLUB"
}
```

### 2. Manual Lock Now
- **Method:** `POST`
- **Route:** `/api/lock`
- **Auth Required:** Yes (`X-Vault-Token`)
- **Action:** Forces servo angle to 0° (latched), resets state machine to `LOCKED`.
- **Response `200 OK`:**
```json
{ "status": "ok" }
```

### 3. Silence Alarm
- **Method:** `POST`
- **Route:** `/api/alarm/silence`
- **Auth Required:** Yes (`X-Vault-Token`)
- **Action:** Mutes buzzer pin without clearing tamper state.
- **Response `200 OK`:**
```json
{ "status": "ok" }
```

### 4. Reset Alarm
- **Method:** `POST`
- **Route:** `/api/alarm/reset`
- **Auth Required:** Yes (`X-Vault-Token`)
- **Action:** Restores system from `ALARM` to `LOCKED`, mutes buzzer, and resets strobe LED.
- **Response `200 OK`:**
```json
{ "status": "ok" }
```

### 5. Card Management
- **List Enrolled Cards:**
  - `GET /api/cards`
  - Response:
  ```json
  [
    {
      "uid": "04:A2:3B:89",
      "name": "Master Keycard",
      "addedAt": 1697800000,
      "lastAccess": 1697801200,
      "active": true
    }
  ]
  ```
- **Initiate Card Enrollment Mode:**
  - `POST /api/cards/enroll`
  - Action: Sets ESP32 into enrollment mode for 10 seconds. Next scanned RFID tag UID is written into NVS storage.
  - Response: `{ "status": "enrolling" }`
- **Revoke / Delete Card:**
  - `DELETE /api/cards/:uid`
  - Response: `{ "status": "deleted" }`

### 6. Event Audit Ring Buffer
- **Method:** `GET`
- **Route:** `/api/log?limit=100`
- **Auth Required:** No
- **Response `200 OK`:**
```json
[
  {
    "id": "log-142010-0",
    "ts": 142010,
    "kind": "UNLOCKED",
    "uid": "04:A2:3B:89",
    "stage": 4,
    "result": "Success",
    "detail": "Locker unlocked. Physical access granted."
  }
]
```

### 7. Security Settings
- **Method:** `POST`
- **Route:** `/api/settings`
- **Auth Required:** Yes (`X-Vault-Token`)
- **Payload:**
```json
{
  "pin": "1234",
  "maxAttempts": 3,
  "lockoutSec": 30,
  "otpTtlSec": 60,
  "armed": true
}
```
- **Response `200 OK`:** `{ "status": "saved" }`

---

## 4. Zero Remote Unlock Security Guarantee
In accordance with zero-trust physical access specifications, **no API endpoint or WebSocket frame exists to remotely actuate the servo to 90° (unlocked)**. The physical lock actuator only energizes upon sequential hardware presentation of a registered RFID card, the physical keypad PIN, and the hardware-generated OTP on the 4x4 keypad matrix.
