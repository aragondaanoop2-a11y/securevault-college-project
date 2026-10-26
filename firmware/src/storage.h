#pragma once
#include <Arduino.h>
#include <Preferences.h>
#include "config.h"

struct VaultConfig {
    char pin[9];
    uint8_t maxAttempts;
    uint16_t lockoutSec;
    uint16_t otpTtlSec;
    bool armed;
};

struct CardEntry {
    char uid[32];
    char name[32];
    uint32_t lastAccess;
};

class Storage {
public:
    Storage();
    bool begin();
    
    // Credentials & Settings
    bool getPin(char* outPin, size_t maxLen);
    bool setPin(const char* newPin);
    bool verifyPin(const char* inputPin);
    
    VaultConfig getConfig();
    bool saveConfig(const VaultConfig& cfg);

    // RFID Card Whitelist
    bool isCardRegistered(const char* uid);
    bool addCard(const char* uid, const char* name = "User Tag");
    bool removeCard(const char* uid);
    int getCardCount();
    bool getCard(int index, CardEntry& outEntry);

private:
    Preferences prefs;
    VaultConfig config;
    void loadDefaults();
};

extern Storage storage;
