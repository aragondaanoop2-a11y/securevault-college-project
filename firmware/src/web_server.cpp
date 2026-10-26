#include "web_server.h"
#include "state_machine.h"
#include "storage.h"

VaultWebServer webServer;

VaultWebServer::VaultWebServer()
    : server(80),
      ws("/ws"),
      ringHead(0),
      ringCount(0),
      lastTelemetryMs(0)
{
}

void VaultWebServer::begin() {
    setupWebSocket();
    setupRoutes();
    server.begin();

    // Log boot event in ring buffer
    pushLog("RELOCKED", "ESP32 SecureVault initialized by TEAM FIGHT CLUB", nullptr, 0, "Success");
}

void VaultWebServer::setupWebSocket() {
    ws.onEvent([this](AsyncWebSocket* server, AsyncWebSocketClient* client, AwsEventType type, void* arg, uint8_t* data, size_t len) {
        if (type == WS_EVT_CONNECT) {
            // Client connected - push initial state
            this->broadcastState();
            this->broadcastTelemetry();
        }
    });

    server.addHandler(&ws);
}

void VaultWebServer::setCorsHeaders(AsyncWebServerResponse* response) {
    response->addHeader("Access-Control-Allow-Origin", "*");
    response->addHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    response->addHeader("Access-Control-Allow-Headers", "Content-Type, X-Vault-Token");
}

bool VaultWebServer::authenticateRequest(AsyncWebServerRequest* request) {
    if (!request->hasHeader(VAULT_TOKEN_HEADER)) {
        return false;
    }
    String token = request->getHeader(VAULT_TOKEN_HEADER)->value();
    return (token == DEFAULT_VAULT_TOKEN);
}

void VaultWebServer::setupRoutes() {
    // OPTIONS handler for CORS preflight
    server.onNotFound([this](AsyncWebServerRequest* request) {
        if (request->method() == HTTP_OPTIONS) {
            AsyncWebServerResponse* response = request->beginResponse(204);
            this->setCorsHeaders(response);
            request->send(response);
        } else {
            request->send(404, "application/json", "{\"error\":\"Not found\"}");
        }
    });

    // GET /api/state
    server.on("/api/state", HTTP_GET, [this](AsyncWebServerRequest* request) {
        StaticJsonDocument<256> doc;
        doc["type"] = "state";
        doc["state"] = stateMachine.getStateString();
        doc["stage"] = stateMachine.getStage();
        doc["failedAttempts"] = stateMachine.getFailedAttempts();
        doc["lockoutRemainingSec"] = stateMachine.getLockoutRemainingSec();
        doc["armed"] = stateMachine.isArmed();
        doc["team"] = TEAM_NAME;

        String json;
        serializeJson(doc, json);
        AsyncWebServerResponse* res = request->beginResponse(200, "application/json", json);
        this->setCorsHeaders(res);
        request->send(res);
    });

    // POST /api/lock
    server.on("/api/lock", HTTP_POST, [this](AsyncWebServerRequest* request) {
        if (!this->authenticateRequest(request)) {
            AsyncWebServerResponse* res = request->beginResponse(401, "application/json", "{\"error\":\"Unauthorized\"}");
            this->setCorsHeaders(res);
            request->send(res);
            return;
        }
        stateMachine.lockNow();
        AsyncWebServerResponse* res = request->beginResponse(200, "application/json", "{\"status\":\"ok\"}");
        this->setCorsHeaders(res);
        request->send(res);
    });

    // POST /api/alarm/silence
    server.on("/api/alarm/silence", HTTP_POST, [this](AsyncWebServerRequest* request) {
        if (!this->authenticateRequest(request)) {
            AsyncWebServerResponse* res = request->beginResponse(401, "application/json", "{\"error\":\"Unauthorized\"}");
            this->setCorsHeaders(res);
            request->send(res);
            return;
        }
        stateMachine.silenceAlarm();
        AsyncWebServerResponse* res = request->beginResponse(200, "application/json", "{\"status\":\"ok\"}");
        this->setCorsHeaders(res);
        request->send(res);
    });

    // POST /api/alarm/reset
    server.on("/api/alarm/reset", HTTP_POST, [this](AsyncWebServerRequest* request) {
        if (!this->authenticateRequest(request)) {
            AsyncWebServerResponse* res = request->beginResponse(401, "application/json", "{\"error\":\"Unauthorized\"}");
            this->setCorsHeaders(res);
            request->send(res);
            return;
        }
        stateMachine.resetAlarm();
        AsyncWebServerResponse* res = request->beginResponse(200, "application/json", "{\"status\":\"ok\"}");
        this->setCorsHeaders(res);
        request->send(res);
    });

    // POST /api/cards/enroll
    server.on("/api/cards/enroll", HTTP_POST, [this](AsyncWebServerRequest* request) {
        if (!this->authenticateRequest(request)) {
            AsyncWebServerResponse* res = request->beginResponse(401, "application/json", "{\"error\":\"Unauthorized\"}");
            this->setCorsHeaders(res);
            request->send(res);
            return;
        }
        stateMachine.startCardEnrollment();
        AsyncWebServerResponse* res = request->beginResponse(200, "application/json", "{\"status\":\"enrolling\"}");
        this->setCorsHeaders(res);
        request->send(res);
    });

    // GET /api/cards
    server.on("/api/cards", HTTP_GET, [this](AsyncWebServerRequest* request) {
        DynamicJsonDocument doc(2048);
        JsonArray arr = doc.to<JsonArray>();

        int count = storage.getCardCount();
        for (int i = 0; i < count; i++) {
            CardEntry entry;
            if (storage.getCard(i, entry)) {
                JsonObject obj = arr.createNestedObject();
                obj["uid"] = entry.uid;
                obj["name"] = entry.name;
                obj["addedAt"] = (uint32_t)1697800000;
                obj["lastAccess"] = entry.lastAccess;
                obj["active"] = true;
            }
        }

        String json;
        serializeJson(doc, json);
        AsyncWebServerResponse* res = request->beginResponse(200, "application/json", json);
        this->setCorsHeaders(res);
        request->send(res);
    });

    // DELETE /api/cards/:uid
    server.on("^\\/api\\/cards\\/([a-zA-Z0-9:]+)$", HTTP_DELETE, [this](AsyncWebServerRequest* request) {
        if (!this->authenticateRequest(request)) {
            AsyncWebServerResponse* res = request->beginResponse(401, "application/json", "{\"error\":\"Unauthorized\"}");
            this->setCorsHeaders(res);
            request->send(res);
            return;
        }
        String uid = request->pathArg(0);
        bool removed = storage.removeCard(uid.c_str());
        AsyncWebServerResponse* res = request->beginResponse(removed ? 200 : 404, "application/json", removed ? "{\"status\":\"deleted\"}" : "{\"error\":\"not found\"}");
        this->setCorsHeaders(res);
        request->send(res);
    });

    // GET /api/log?limit=100
    server.on("/api/log", HTTP_GET, [this](AsyncWebServerRequest* request) {
        int limit = 100;
        if (request->hasParam("limit")) {
            limit = request->getParam("limit")->value().toInt();
            if (limit <= 0 || limit > RING_BUFFER_MAX_EVENTS) limit = RING_BUFFER_MAX_EVENTS;
        }

        DynamicJsonDocument doc(8192);
        JsonArray arr = doc.to<JsonArray>();

        int items = min(limit, this->ringCount);
        for (int i = 0; i < items; i++) {
            int idx = (this->ringHead - 1 - i + RING_BUFFER_MAX_EVENTS) % RING_BUFFER_MAX_EVENTS;
            const LogEvent& ev = this->eventBuffer[idx];
            JsonObject obj = arr.createNestedObject();
            obj["id"] = "log-" + String(ev.ts) + "-" + String(i);
            obj["ts"] = ev.ts;
            obj["kind"] = ev.kind;
            if (strlen(ev.uid) > 0) obj["uid"] = ev.uid;
            obj["stage"] = ev.stage;
            obj["result"] = ev.result;
            obj["detail"] = ev.detail;
        }

        String json;
        serializeJson(doc, json);
        AsyncWebServerResponse* res = request->beginResponse(200, "application/json", json);
        this->setCorsHeaders(res);
        request->send(res);
    });
}

void VaultWebServer::pushLog(const char* kind, const char* detail, const char* uid, uint8_t stage, const char* result) {
    LogEvent& ev = eventBuffer[ringHead];
    ev.ts = millis();
    strncpy(ev.kind, kind ? kind : "INFO", sizeof(ev.kind) - 1);
    ev.kind[sizeof(ev.kind) - 1] = '\0';

    if (uid) {
        strncpy(ev.uid, uid, sizeof(ev.uid) - 1);
        ev.uid[sizeof(ev.uid) - 1] = '\0';
    } else {
        ev.uid[0] = '\0';
    }

    ev.stage = stage;

    const char* resStr = result ? result : (strstr(kind, "FAIL") ? "Failed" : strcmp(kind, "TAMPER") == 0 ? "Tamper" : "Success");
    strncpy(ev.result, resStr, sizeof(ev.result) - 1);
    ev.result[sizeof(ev.result) - 1] = '\0';

    strncpy(ev.detail, detail ? detail : "", sizeof(ev.detail) - 1);
    ev.detail[sizeof(ev.detail) - 1] = '\0';

    ringHead = (ringHead + 1) % RING_BUFFER_MAX_EVENTS;
    if (ringCount < RING_BUFFER_MAX_EVENTS) ringCount++;
}

void VaultWebServer::broadcastState() {
    StaticJsonDocument<256> doc;
    doc["type"] = "state";
    doc["state"] = stateMachine.getStateString();
    doc["stage"] = stateMachine.getStage();
    doc["failedAttempts"] = stateMachine.getFailedAttempts();
    doc["lockoutRemainingSec"] = stateMachine.getLockoutRemainingSec();
    doc["armed"] = stateMachine.isArmed();
    doc["team"] = TEAM_NAME;

    String json;
    serializeJson(doc, json);
    ws.textAll(json);
}

void VaultWebServer::broadcastEvent(const char* kind, const char* detail, const char* uid, uint8_t stage, const char* result) {
    pushLog(kind, detail, uid, stage, result);

    StaticJsonDocument<384> doc;
    doc["type"] = "event";
    doc["ts"] = millis();
    doc["kind"] = kind;
    if (uid) doc["uid"] = uid;
    doc["stage"] = stage;
    doc["result"] = result ? result : (strstr(kind, "FAIL") ? "Failed" : strcmp(kind, "TAMPER") == 0 ? "Tamper" : "Success");
    doc["detail"] = detail;

    String json;
    serializeJson(doc, json);
    ws.textAll(json);
}

void VaultWebServer::broadcastOtp(const char* code, uint16_t ttlSec) {
    StaticJsonDocument<192> doc;
    doc["type"] = "otp";
    doc["code"] = code;
    doc["expiresInSec"] = ttlSec;

    String json;
    serializeJson(doc, json);
    ws.textAll(json);
}

void VaultWebServer::broadcastTelemetry() {
    StaticJsonDocument<256> doc;
    doc["type"] = "telemetry";
    doc["rssi"] = WiFi.RSSI();
    doc["uptimeSec"] = millis() / 1000;
    doc["heap"] = ESP.getFreeHeap();
    doc["servoAngle"] = stateMachine.getServoAngle();

    String json;
    serializeJson(doc, json);
    ws.textAll(json);
}

void VaultWebServer::update() {
    ws.cleanupClients();

    unsigned long now = millis();
    if (now - lastTelemetryMs > 3000) {
        lastTelemetryMs = now;
        broadcastTelemetry();
    }
}
