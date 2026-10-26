#include "storage.h"

Storage storage;

Storage::Storage() {}

bool Storage::begin() {
    if (!prefs.begin("securevault", false)) {
        return false;
    }

    // Initialize config if not set
    if (!prefs.isKey("pin")) {
        loadDefaults();
    } else {
        String p = prefs.getString("pin", DEFAULT_MASTER_PIN);
        strncpy(config.pin, p.c_str(), sizeof(config.pin) - 1);
        config.pin[sizeof(config.pin) - 1] = '\0';

        config.maxAttempts = prefs.getUChar("maxAttempts", DEFAULT_MAX_ATTEMPTS);
        config.lockoutSec = prefs.getUShort("lockoutSec", DEFAULT_LOCKOUT_SEC);
        config.otpTtlSec = prefs.getUShort("otpTtlSec", DEFAULT_OTP_TTL_SEC);
        config.armed = prefs.getBool("armed", true);
    }
    return true;
}

void Storage::loadDefaults() {
    strncpy(config.pin, DEFAULT_MASTER_PIN, sizeof(config.pin) - 1);
    config.pin[sizeof(config.pin) - 1] = '\0';
    config.maxAttempts = DEFAULT_MAX_ATTEMPTS;
    config.lockoutSec = DEFAULT_LOCKOUT_SEC;
    config.otpTtlSec = DEFAULT_OTP_TTL_SEC;
    config.armed = true;

    prefs.putString("pin", config.pin);
    prefs.putUChar("maxAttempts", config.maxAttempts);
    prefs.putUShort("lockoutSec", config.lockoutSec);
    prefs.putUShort("otpTtlSec", config.otpTtlSec);
    prefs.putBool("armed", config.armed);

    // Seed default demo RFID tags
    addCard("04:A2:3B:89", "Master Keycard");
    addCard("1B:88:CF:42", "Backup Token");
}

bool Storage::getPin(char* outPin, size_t maxLen) {
    if (!outPin || maxLen == 0) return false;
    strncpy(outPin, config.pin, maxLen - 1);
    outPin[maxLen - 1] = '\0';
    return true;
}

bool Storage::setPin(const char* newPin) {
    if (!newPin || strlen(newPin) < 4 || strlen(newPin) > 8) return false;
    strncpy(config.pin, newPin, sizeof(config.pin) - 1);
    config.pin[sizeof(config.pin) - 1] = '\0';
    prefs.putString("pin", config.pin);
    return true;
}

bool Storage::verifyPin(const char* inputPin) {
    if (!inputPin) return false;
    return (strcmp(config.pin, inputPin) == 0);
}

VaultConfig Storage::getConfig() {
    return config;
}

bool Storage::saveConfig(const VaultConfig& cfg) {
    config = cfg;
    prefs.putString("pin", config.pin);
    prefs.putUChar("maxAttempts", config.maxAttempts);
    prefs.putUShort("lockoutSec", config.lockoutSec);
    prefs.putUShort("otpTtlSec", config.otpTtlSec);
    prefs.putBool("armed", config.armed);
    return true;
}

int Storage::getCardCount() {
    return prefs.getInt("cardCount", 0);
}

bool Storage::isCardRegistered(const char* uid) {
    if (!uid) return false;
    int count = getCardCount();
    for (int i = 0; i < count; i++) {
        String keyUid = "c_uid_" + String(i);
        String savedUid = prefs.getString(keyUid.c_str(), "");
        if (savedUid.equalsIgnoreCase(uid)) {
            // Update last access timestamp in NVS
            String keyTime = "c_acc_" + String(i);
            prefs.putUInt(keyTime.c_str(), (uint32_t)(millis() / 1000));
            return true;
        }
    }
    return false;
}

bool Storage::addCard(const char* uid, const char* name) {
    if (!uid || isCardRegistered(uid)) return false;
    int count = getCardCount();
    if (count >= 20) return false; // NVS slot limit

    String keyUid = "c_uid_" + String(count);
    String keyName = "c_nam_" + String(count);
    String keyTime = "c_acc_" + String(count);

    prefs.putString(keyUid.c_str(), uid);
    prefs.putString(keyName.c_str(), name);
    prefs.putUInt(keyTime.c_str(), 0);

    prefs.putInt("cardCount", count + 1);
    return true;
}

bool Storage::removeCard(const char* uid) {
    if (!uid) return false;
    int count = getCardCount();
    int foundIdx = -1;

    for (int i = 0; i < count; i++) {
        String keyUid = "c_uid_" + String(i);
        if (prefs.getString(keyUid.c_str(), "").equalsIgnoreCase(uid)) {
            foundIdx = i;
            break;
        }
    }

    if (foundIdx == -1) return false;

    // Shift subsequent cards down
    for (int i = foundIdx; i < count - 1; i++) {
        String curUidKey = "c_uid_" + String(i);
        String curNamKey = "c_nam_" + String(i);
        String curAccKey = "c_acc_" + String(i);

        String nxtUid = prefs.getString(("c_uid_" + String(i + 1)).c_str(), "");
        String nxtNam = prefs.getString(("c_nam_" + String(i + 1)).c_str(), "");
        uint32_t nxtAcc = prefs.getUInt(("c_acc_" + String(i + 1)).c_str(), 0);

        prefs.putString(curUidKey.c_str(), nxtUid);
        prefs.putString(curNamKey.c_str(), nxtNam);
        prefs.putUInt(curAccKey.c_str(), nxtAcc);
    }

    // Remove last slot
    prefs.remove(("c_uid_" + String(count - 1)).c_str());
    prefs.remove(("c_nam_" + String(count - 1)).c_str());
    prefs.remove(("c_acc_" + String(count - 1)).c_str());

    prefs.putInt("cardCount", count - 1);
    return true;
}

bool Storage::getCard(int index, CardEntry& outEntry) {
    int count = getCardCount();
    if (index < 0 || index >= count) return false;

    String keyUid = "c_uid_" + String(index);
    String keyName = "c_nam_" + String(index);
    String keyTime = "c_acc_" + String(index);

    String uidStr = prefs.getString(keyUid.c_str(), "");
    String nameStr = prefs.getString(keyName.c_str(), "");
    uint32_t acc = prefs.getUInt(keyTime.c_str(), 0);

    strncpy(outEntry.uid, uidStr.c_str(), sizeof(outEntry.uid) - 1);
    outEntry.uid[sizeof(outEntry.uid) - 1] = '\0';

    strncpy(outEntry.name, nameStr.c_str(), sizeof(outEntry.name) - 1);
    outEntry.name[sizeof(outEntry.name) - 1] = '\0';

    outEntry.lastAccess = acc;
    return true;
}
