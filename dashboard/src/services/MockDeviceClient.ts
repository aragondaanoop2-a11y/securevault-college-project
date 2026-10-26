/**
 * Mock Device Client & Hardware Simulator
 * TEAM FIGHT CLUB
 * Provides high-fidelity ESP32 simulation for demonstrations without hardware.
 */

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
import { TEAM_NAME } from '../config/brand';

export class MockDeviceClient implements IDeviceClient {
  private status: ConnectionStatus = 'demo';
  private stateSubscribers: Set<(state: VaultStatePayload) => void> = new Set();
  private eventSubscribers: Set<(event: VaultEvent) => void> = new Set();
  private otpSubscribers: Set<(otp: OtpData | null) => void> = new Set();
  private telemetrySubscribers: Set<(telemetry: DeviceTelemetry) => void> = new Set();
  private connectionSubscribers: Set<(status: ConnectionStatus) => void> = new Set();

  private currentState: VaultStatePayload = {
    type: 'state',
    state: 'LOCKED',
    stage: 0,
    failedAttempts: 0,
    lockoutRemainingSec: 0,
    armed: true,
    team: TEAM_NAME,
  };

  private currentOtp: OtpData | null = null;
  private otpTimer: any = null;
  private autoRelockTimer: any = null;
  private lockoutTimer: any = null;
  private telemetryTimer: any = null;

  private registeredCards: RegisteredCard[] = [
    { uid: '04:A2:3B:89', name: 'Commander Keycard', addedAt: Date.now() - 86400000 * 5, lastAccess: Date.now() - 3600000 * 2, active: true },
    { uid: '1B:88:CF:42', name: 'Armory Backup Token', addedAt: Date.now() - 86400000 * 2, lastAccess: Date.now() - 86400000, active: true },
    { uid: '9C:14:7D:55', name: 'Field Operative Badge', addedAt: Date.now() - 86400000, lastAccess: Date.now() - 3600000 * 18, active: true },
  ];

  private logs: VaultEvent[] = [
    {
      id: 'log-1',
      ts: Date.now() - 3600000 * 3,
      kind: 'UNLOCKED',
      uid: '04:A2:3B:89',
      stage: 4,
      result: 'Success',
      detail: 'Access granted via full verification flow.'
    },
    {
      id: 'log-2',
      ts: Date.now() - 3600000 * 3 + 10000,
      kind: 'RELOCKED',
      stage: 0,
      result: 'Success',
      detail: 'Auto-relock timer engaged. Servo latched.'
    },
    {
      id: 'log-3',
      ts: Date.now() - 3600000 * 1.5,
      kind: 'RFID_FAIL',
      uid: 'DE:AD:BE:EF',
      stage: 1,
      result: 'Blocked',
      detail: 'Unregistered RFID UID detected.'
    },
    {
      id: 'log-4',
      ts: Date.now() - 3600000 * 0.8,
      kind: 'PIN_FAIL',
      uid: '04:A2:3B:89',
      stage: 2,
      result: 'Failed',
      detail: 'Incorrect PIN entered on 4x4 keypad.'
    }
  ];

  private settings: VaultSettings = {
    deviceIp: '192.168.1.145 (Simulator)',
    apiToken: '',
    pin: '1234',
    maxAttempts: 3,
    lockoutSec: 30,
    otpTtlSec: 60,
    armed: true,
    demoMode: true,
    theme: 'dark'
  };

  private uptimeSeconds = 1420;
  private isEnrolling = false;

  constructor() {
    this.startTelemetryLoop();
  }

  public connect(): void {
    this.status = 'demo';
    this.notifyConnection();
    this.broadcastState();
  }

  public disconnect(): void {
    this.status = 'disconnected';
    this.notifyConnection();
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  private startTelemetryLoop(): void {
    if (this.telemetryTimer) clearInterval(this.telemetryTimer);
    this.telemetryTimer = setInterval(() => {
      this.uptimeSeconds += 2;
      const telemetry: DeviceTelemetry = {
        type: 'telemetry',
        rssi: -54 - Math.floor(Math.random() * 6),
        uptimeSec: this.uptimeSeconds,
        heap: 184320 + Math.floor(Math.random() * 400),
        servoAngle: this.currentState.state === 'UNLOCKED' ? 90 : 0,
        ip: '192.168.1.145 (Mock)',
        lastPingMs: 12 + Math.floor(Math.random() * 8)
      };
      this.telemetrySubscribers.forEach(cb => cb(telemetry));
    }, 2000);
  }

  // --- Subscriptions ---
  public onStateChange(cb: (state: VaultStatePayload) => void): () => void {
    this.stateSubscribers.add(cb);
    cb(this.currentState);
    return () => this.stateSubscribers.delete(cb);
  }

  public onEvent(cb: (event: VaultEvent) => void): () => void {
    this.eventSubscribers.add(cb);
    return () => this.eventSubscribers.delete(cb);
  }

  public onOtp(cb: (otp: OtpData | null) => void): () => void {
    this.otpSubscribers.add(cb);
    cb(this.currentOtp);
    return () => this.otpSubscribers.delete(cb);
  }

  public onTelemetry(cb: (telemetry: DeviceTelemetry) => void): () => void {
    this.telemetrySubscribers.add(cb);
    return () => this.telemetrySubscribers.delete(cb);
  }

  public onConnectionChange(cb: (status: ConnectionStatus) => void): () => void {
    this.connectionSubscribers.add(cb);
    cb(this.status);
    return () => this.connectionSubscribers.delete(cb);
  }

  private notifyConnection(): void {
    this.connectionSubscribers.forEach(cb => cb(this.status));
  }

  private broadcastState(): void {
    this.stateSubscribers.forEach(cb => cb({ ...this.currentState }));
  }

  private pushEvent(kind: VaultEvent['kind'], detail: string, uid?: string, stage?: number, result?: VaultEvent['result']): void {
    const event: VaultEvent = {
      id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: 'event',
      ts: Date.now(),
      kind,
      uid,
      stage: stage ?? this.currentState.stage,
      result: result ?? (kind.includes('FAIL') ? 'Failed' : kind === 'TAMPER' ? 'Tamper' : 'Success'),
      detail
    };
    this.logs.unshift(event);
    if (this.logs.length > 100) this.logs.pop();
    this.eventSubscribers.forEach(cb => cb(event));
  }

  // --- User / Hardware Actions (Simulator API) ---

  public simulateRfidTap(uid: string = '04:A2:3B:89'): boolean {
    if (this.currentState.state === 'LOCKOUT') {
      this.pushEvent('RFID_FAIL', 'Card scanned during active lockout window. Rejected.', uid, 0, 'Blocked');
      return false;
    }

    if (this.isEnrolling) {
      this.isEnrolling = false;
      const existing = this.registeredCards.find(c => c.uid.toLowerCase() === uid.toLowerCase());
      if (!existing) {
        const newCard: RegisteredCard = {
          uid: uid.toUpperCase(),
          name: `Enrolled Tag #${this.registeredCards.length + 1}`,
          addedAt: Date.now(),
          active: true
        };
        this.registeredCards.push(newCard);
        this.pushEvent('RFID_OK', `New RFID card [${uid}] successfully enrolled.`, uid, 0, 'Success');
      }
      return true;
    }

    const card = this.registeredCards.find(c => c.uid.toLowerCase() === uid.toLowerCase() && c.active);
    if (card) {
      card.lastAccess = Date.now();
      this.currentState.stage = 1; // Stage 1 reached, awaiting PIN
      this.pushEvent('RFID_OK', `Card ${card.name} (${uid}) authorized. Awaiting Keypad PIN.`, uid, 1, 'Success');
      this.broadcastState();
      return true;
    } else {
      this.handleFailure('RFID_FAIL', `Unrecognized card UID ${uid} scanned.`, uid, 1);
      return false;
    }
  }

  public simulateKeypadPin(pin: string = '1234'): boolean {
    if (this.currentState.state === 'LOCKOUT') return false;
    if (this.currentState.stage < 1) {
      this.pushEvent('PIN_FAIL', 'PIN entered without prior RFID presentation.', undefined, 0, 'Blocked');
      return false;
    }

    if (pin === this.settings.pin) {
      this.currentState.stage = 2; // PIN verified
      this.pushEvent('PIN_OK', 'Keypad PIN verified. Generating dynamic OTP.', undefined, 2, 'Success');
      
      // Generate 6 digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      this.currentOtp = {
        type: 'otp',
        code,
        expiresInSec: this.settings.otpTtlSec,
        issuedAt: Date.now()
      };
      this.currentState.state = 'OTP_PENDING';
      this.broadcastState();
      this.pushEvent('OTP_ISSUED', `6-digit OTP dispatched to authorized dashboard. TTL: ${this.settings.otpTtlSec}s.`, undefined, 2, 'Success');
      this.otpSubscribers.forEach(cb => cb(this.currentOtp));

      // OTP expiry timer
      if (this.otpTimer) clearTimeout(this.otpTimer);
      this.otpTimer = setTimeout(() => {
        if (this.currentState.state === 'OTP_PENDING') {
          this.handleFailure('OTP_FAIL', 'OTP validation window expired.', undefined, 2);
          this.currentOtp = null;
          this.otpSubscribers.forEach(cb => cb(null));
        }
      }, this.settings.otpTtlSec * 1000);

      return true;
    } else {
      this.handleFailure('PIN_FAIL', 'Incorrect PIN code entered on keypad.', undefined, 2);
      return false;
    }
  }

  public simulateKeypadOtp(otp: string): boolean {
    if (this.currentState.state !== 'OTP_PENDING' || !this.currentOtp) {
      this.pushEvent('OTP_FAIL', 'OTP entered but no challenge active.', undefined, 2, 'Blocked');
      return false;
    }

    if (otp === this.currentOtp.code) {
      if (this.otpTimer) clearTimeout(this.otpTimer);
      this.currentOtp = null;
      this.otpSubscribers.forEach(cb => cb(null));

      this.currentState.state = 'UNLOCKED';
      this.currentState.stage = 4;
      this.currentState.failedAttempts = 0;
      this.broadcastState();
      this.pushEvent('OTP_OK', 'OTP verified. Actuator swinging to 90 degrees.', undefined, 3, 'Success');
      this.pushEvent('UNLOCKED', 'Locker unlocked. Vault accessible.', undefined, 4, 'Success');

      // Auto-relock after 10s
      if (this.autoRelockTimer) clearTimeout(this.autoRelockTimer);
      this.autoRelockTimer = setTimeout(() => {
        this.relock('Auto-relock timer expired (10s). Latch secured.');
      }, 10000);

      return true;
    } else {
      this.handleFailure('OTP_FAIL', 'Invalid OTP entered on keypad.', undefined, 3);
      return false;
    }
  }

  public simulateTamper(): void {
    if (!this.currentState.armed) return;
    this.currentState.state = 'ALARM';
    this.currentState.stage = 0;
    this.broadcastState();
    this.pushEvent('TAMPER', 'Physical motion or enclosure vibration detected while armed! Alarm buzzer active.', undefined, 0, 'Tamper');
  }

  private handleFailure(kind: VaultEvent['kind'], detail: string, uid?: string, stage?: number): void {
    this.currentState.failedAttempts += 1;
    this.pushEvent(kind, detail, uid, stage, 'Failed');

    if (this.currentState.failedAttempts >= this.settings.maxAttempts) {
      this.triggerLockout();
    } else {
      this.currentState.state = 'LOCKED';
      this.currentState.stage = 0;
      this.broadcastState();
    }
  }

  public triggerLockout(): void {
    this.currentState.state = 'LOCKOUT';
    this.currentState.stage = 0;
    this.currentState.lockoutRemainingSec = this.settings.lockoutSec;
    this.broadcastState();
    this.pushEvent('LOCKOUT', `Maximum failed attempts (${this.settings.maxAttempts}) exceeded. System locked down for ${this.settings.lockoutSec}s.`, undefined, 0, 'Blocked');

    if (this.lockoutTimer) clearInterval(this.lockoutTimer);
    this.lockoutTimer = setInterval(() => {
      this.currentState.lockoutRemainingSec -= 1;
      if (this.currentState.lockoutRemainingSec <= 0) {
        clearInterval(this.lockoutTimer);
        this.currentState.state = 'LOCKED';
        this.currentState.failedAttempts = 0;
        this.currentState.lockoutRemainingSec = 0;
        this.pushEvent('RELOCKED', 'Lockout cooldown expired. System restored to normal stand-by.', undefined, 0, 'Success');
      }
      this.broadcastState();
    }, 1000);
  }

  private relock(reason: string): void {
    if (this.autoRelockTimer) clearTimeout(this.autoRelockTimer);
    this.currentState.state = 'LOCKED';
    this.currentState.stage = 0;
    this.broadcastState();
    this.pushEvent('RELOCKED', reason, undefined, 0, 'Success');
  }

  // --- IDeviceClient implementations ---

  public async lockNow(): Promise<boolean> {
    this.relock('Manual "Lock Now" command received from authorized dashboard.');
    return true;
  }

  public async silenceAlarm(): Promise<boolean> {
    if (this.currentState.state === 'ALARM') {
      this.pushEvent('RELOCKED', 'Alarm silenced by operator. Standby mode maintained.', undefined, 0, 'Success');
    }
    return true;
  }

  public async resetAlarm(): Promise<boolean> {
    this.currentState.state = 'LOCKED';
    this.currentState.stage = 0;
    this.currentState.failedAttempts = 0;
    this.broadcastState();
    this.pushEvent('RELOCKED', 'Alarm reset by operator. Safe state restored.', undefined, 0, 'Success');
    return true;
  }

  public async startCardEnroll(): Promise<boolean> {
    this.isEnrolling = true;
    this.pushEvent('RFID_OK', 'Enrollment mode active. Tap new card to register UID.', undefined, 0, 'Success');
    return true;
  }

  public async cancelCardEnroll(): Promise<boolean> {
    this.isEnrolling = false;
    return true;
  }

  public async deleteCard(uid: string): Promise<boolean> {
    this.registeredCards = this.registeredCards.filter(c => c.uid.toLowerCase() !== uid.toLowerCase());
    this.pushEvent('RELOCKED', `Card ${uid} removed from registered whitelist.`, uid, 0, 'Success');
    return true;
  }

  public async addCard(card: RegisteredCard): Promise<boolean> {
    this.registeredCards.push(card);
    return true;
  }

  public async getCards(): Promise<RegisteredCard[]> {
    return [...this.registeredCards];
  }

  public async updateSettings(newSettings: Partial<VaultSettings>): Promise<boolean> {
    this.settings = { ...this.settings, ...newSettings };
    if (newSettings.armed !== undefined) {
      this.currentState.armed = newSettings.armed;
      this.broadcastState();
    }
    return true;
  }

  public async getLogs(limit: number = 100): Promise<VaultEvent[]> {
    return this.logs.slice(0, limit);
  }

  public getSimulatorOtp(): string | null {
    return this.currentOtp ? this.currentOtp.code : null;
  }
}
