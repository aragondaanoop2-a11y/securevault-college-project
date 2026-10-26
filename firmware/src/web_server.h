#pragma once
#include <Arduino.h>
#include <ESPAsyncWebServer.h>
#include <AsyncTCP.h>
#include <ArduinoJson.h>
#include "config.h"

struct LogEvent {
    unsigned long ts;
    char kind[16];
    char uid[32];
    uint8_t stage;
    char result[12];
    char detail[96];
};

class VaultWebServer {
public:
    VaultWebServer();
    void begin();
    void update();

    // Broadcasts over WebSocket
    void broadcastState();
    void broadcastEvent(const char* kind, const char* detail, const char* uid = nullptr, uint8_t stage = 0, const char* result = nullptr);
    void broadcastOtp(const char* code, uint16_t ttlSec);
    void broadcastTelemetry();

    // Event Ring Buffer
    void pushLog(const char* kind, const char* detail, const char* uid = nullptr, uint8_t stage = 0, const char* result = nullptr);

private:
    AsyncWebServer server;
    AsyncWebSocket ws;
    
    // RAM Ring Buffer
    LogEvent eventBuffer[RING_BUFFER_MAX_EVENTS];
    int ringHead;
    int ringCount;

    unsigned long lastTelemetryMs;

    void setupRoutes();
    void setupWebSocket();
    bool authenticateRequest(AsyncWebServerRequest* request);
    void setCorsHeaders(AsyncWebServerResponse* response);
};

extern VaultWebServer webServer;
