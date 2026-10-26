/**
 * Vault State & Client Management Context
 * TEAM FIGHT CLUB
 */

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { 
  IDeviceClient, 
  VaultStatePayload, 
  VaultEvent, 
  OtpData, 
  DeviceTelemetry, 
  RegisteredCard, 
  VaultSettings, 
  ConnectionStatus 
} from '../types/vault';
import { MockDeviceClient } from '../services/MockDeviceClient';
import { RealDeviceClient } from '../services/RealDeviceClient';
import { DEFAULT_DEVICE_IP, DEFAULT_TOKEN, TEAM_NAME } from '../config/brand';
import confetti from 'canvas-confetti';

interface VaultContextType {
  client: IDeviceClient;
  state: VaultStatePayload;
  status: ConnectionStatus;
  otp: OtpData | null;
  telemetry: DeviceTelemetry;
  events: VaultEvent[];
  cards: RegisteredCard[];
  settings: VaultSettings;
  isSimulator: boolean;
  
  // Actions
  lockNow: () => Promise<boolean>;
  silenceAlarm: () => Promise<boolean>;
  resetAlarm: () => Promise<boolean>;
  enrollCard: () => Promise<boolean>;
  deleteCard: (uid: string) => Promise<boolean>;
  updateSettings: (newSettings: Partial<VaultSettings>) => Promise<boolean>;
  toggleDemoMode: (enabled: boolean) => void;
  reconnect: () => void;

  // Simulator controls
  simulatorActions?: {
    simulateRfidTap: (uid?: string) => boolean;
    simulateKeypadPin: (pin?: string) => boolean;
    simulateKeypadOtp: (otp: string) => boolean;
    simulateTamper: () => void;
    triggerLockout: () => void;
    autoWalkthroughSuccess: () => Promise<void>;
    autoWalkthroughFail: () => Promise<void>;
    getSimulatorOtp: () => string | null;
  };
}

const defaultSettings: VaultSettings = {
  deviceIp: DEFAULT_DEVICE_IP,
  apiToken: DEFAULT_TOKEN,
  pin: '1234',
  maxAttempts: 3,
  lockoutSec: 30,
  otpTtlSec: 60,
  armed: true,
  demoMode: true, // Default to demo so app starts cleanly out-of-the-box
  theme: 'dark'
};

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load settings from localStorage
  const [settings, setSettings] = useState<VaultSettings>(() => {
    try {
      const saved = localStorage.getItem('securevault_settings');
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  // Client instances
  const mockClient = useMemo(() => new MockDeviceClient(), []);
  const [realClient, setRealClient] = useState<RealDeviceClient>(() => new RealDeviceClient(settings.deviceIp, settings.apiToken));

  const activeClient: IDeviceClient = settings.demoMode ? mockClient : realClient;

  // State
  const [state, setState] = useState<VaultStatePayload>({
    type: 'state',
    state: 'LOCKED',
    stage: 0,
    failedAttempts: 0,
    lockoutRemainingSec: 0,
    armed: settings.armed,
    team: TEAM_NAME,
  });

  const [status, setStatus] = useState<ConnectionStatus>(settings.demoMode ? 'demo' : 'disconnected');
  const [otp, setOtp] = useState<OtpData | null>(null);
  const [telemetry, setTelemetry] = useState<DeviceTelemetry>({
    type: 'telemetry',
    rssi: -58,
    uptimeSec: 360,
    heap: 185400,
    servoAngle: 0,
    ip: settings.deviceIp,
    lastPingMs: 14
  });

  const [events, setEvents] = useState<VaultEvent[]>([]);
  const [cards, setCards] = useState<RegisteredCard[]>([]);

  // Connect active client and wire listeners
  useEffect(() => {
    if (!settings.demoMode) {
      const newReal = new RealDeviceClient(settings.deviceIp, settings.apiToken);
      setRealClient(newReal);
      newReal.connect();
    } else {
      mockClient.connect();
    }
  }, [settings.demoMode, settings.deviceIp, settings.apiToken, mockClient]);

  useEffect(() => {
    const unsubState = activeClient.onStateChange((newState) => {
      setState(newState);
      if (newState.state === 'UNLOCKED') {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#f43f5e', '#ec4899', '#f97316', '#eab308']
          });
        } catch {}
      }
    });

    const unsubEvent = activeClient.onEvent((newEvent) => {
      setEvents((prev) => [newEvent, ...prev].slice(0, 100));
    });

    const unsubOtp = activeClient.onOtp((newOtp) => {
      setOtp(newOtp);
    });

    const unsubTelemetry = activeClient.onTelemetry((newTelemetry) => {
      setTelemetry(newTelemetry);
    });

    const unsubStatus = activeClient.onConnectionChange((newStatus) => {
      setStatus(newStatus);
    });

    // Initial logs and cards fetch
    activeClient.getLogs().then(loadedLogs => {
      if (loadedLogs && loadedLogs.length > 0) setEvents(loadedLogs);
    });
    activeClient.getCards().then(loadedCards => {
      if (loadedCards) setCards(loadedCards);
    });

    return () => {
      unsubState();
      unsubEvent();
      unsubOtp();
      unsubTelemetry();
      unsubStatus();
    };
  }, [activeClient]);

  // Actions
  const lockNow = useCallback(async () => {
    return await activeClient.lockNow();
  }, [activeClient]);

  const silenceAlarm = useCallback(async () => {
    return await activeClient.silenceAlarm();
  }, [activeClient]);

  const resetAlarm = useCallback(async () => {
    return await activeClient.resetAlarm();
  }, [activeClient]);

  const enrollCard = useCallback(async () => {
    const success = await activeClient.startCardEnroll();
    if (success) {
      const updated = await activeClient.getCards();
      setCards(updated);
    }
    return success;
  }, [activeClient]);

  const deleteCard = useCallback(async (uid: string) => {
    const success = await activeClient.deleteCard(uid);
    if (success) {
      const updated = await activeClient.getCards();
      setCards(updated);
    }
    return success;
  }, [activeClient]);

  const updateSettings = useCallback(async (newSettings: Partial<VaultSettings>) => {
    const merged = { ...settings, ...newSettings };
    setSettings(merged);
    try {
      localStorage.setItem('securevault_settings', JSON.stringify(merged));
    } catch {}
    return await activeClient.updateSettings(newSettings);
  }, [settings, activeClient]);

  const toggleDemoMode = useCallback((enabled: boolean) => {
    updateSettings({ demoMode: enabled });
  }, [updateSettings]);

  const reconnect = useCallback(() => {
    if (!settings.demoMode) {
      realClient.disconnect();
      realClient.connect(settings.deviceIp, settings.apiToken);
    } else {
      mockClient.connect();
    }
  }, [settings.demoMode, settings.deviceIp, settings.apiToken, realClient, mockClient]);

  // Interactive Simulator Walkthrough Helpers
  const autoWalkthroughSuccess = useCallback(async () => {
    if (!settings.demoMode) return;
    // Step 1: Scan valid card
    mockClient.simulateRfidTap('04:A2:3B:89');
    await new Promise(r => setTimeout(r, 1200));

    // Step 2: Enter correct PIN "1234"
    mockClient.simulateKeypadPin('1234');
    await new Promise(r => setTimeout(r, 1500));

    // Step 3: Read current OTP and enter it
    const issuedOtp = mockClient.getSimulatorOtp();
    if (issuedOtp) {
      mockClient.simulateKeypadOtp(issuedOtp);
    }
  }, [settings.demoMode, mockClient]);

  const autoWalkthroughFail = useCallback(async () => {
    if (!settings.demoMode) return;
    // 3 consecutive failed PIN attempts
    mockClient.simulateRfidTap('04:A2:3B:89');
    await new Promise(r => setTimeout(r, 800));
    mockClient.simulateKeypadPin('9999'); // Fail 1
    await new Promise(r => setTimeout(r, 900));

    mockClient.simulateRfidTap('04:A2:3B:89');
    await new Promise(r => setTimeout(r, 800));
    mockClient.simulateKeypadPin('8888'); // Fail 2
    await new Promise(r => setTimeout(r, 900));

    mockClient.simulateRfidTap('04:A2:3B:89');
    await new Promise(r => setTimeout(r, 800));
    mockClient.simulateKeypadPin('7777'); // Fail 3 -> LOCKOUT!
  }, [settings.demoMode, mockClient]);

  const simulatorActions = useMemo(() => {
    return {
      simulateRfidTap: (uid?: string) => mockClient.simulateRfidTap(uid),
      simulateKeypadPin: (pin?: string) => mockClient.simulateKeypadPin(pin),
      simulateKeypadOtp: (otpCode: string) => mockClient.simulateKeypadOtp(otpCode),
      simulateTamper: () => mockClient.simulateTamper(),
      triggerLockout: () => mockClient.triggerLockout(),
      autoWalkthroughSuccess,
      autoWalkthroughFail,
      getSimulatorOtp: () => mockClient.getSimulatorOtp(),
    };
  }, [mockClient, autoWalkthroughSuccess, autoWalkthroughFail]);

  return (
    <VaultContext.Provider
      value={{
        client: activeClient,
        state,
        status,
        otp,
        telemetry,
        events,
        cards,
        settings,
        isSimulator: settings.demoMode,
        lockNow,
        silenceAlarm,
        resetAlarm,
        enrollCard,
        deleteCard,
        updateSettings,
        toggleDemoMode,
        reconnect,
        simulatorActions: settings.demoMode ? simulatorActions : undefined
      }}
    >
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = () => {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error('useVault must be used within VaultProvider');
  return ctx;
};
