/**
 * Core Data Models & API Types for SecureVault
 * TEAM FIGHT CLUB
 */

export type VaultState = 'LOCKED' | 'OTP_PENDING' | 'UNLOCKED' | 'ALARM' | 'LOCKOUT';

export type EventKind = 
  | 'RFID_OK' 
  | 'RFID_FAIL' 
  | 'PIN_OK' 
  | 'PIN_FAIL' 
  | 'OTP_ISSUED' 
  | 'OTP_OK' 
  | 'OTP_FAIL' 
  | 'UNLOCKED' 
  | 'RELOCKED' 
  | 'LOCKOUT' 
  | 'TAMPER';

export type EventResult = 'Success' | 'Failed' | 'Blocked' | 'Tamper';

export interface VaultStatePayload {
  type: 'state';
  state: VaultState;
  stage: number; // 0 to 4
  failedAttempts: number;
  lockoutRemainingSec: number;
  armed: boolean;
  team: string; // "TEAM FIGHT CLUB"
}

export interface VaultEvent {
  id?: string;
  type?: 'event';
  ts: number; // epoch ms
  kind: EventKind;
  uid?: string;
  stage?: number;
  result?: EventResult;
  detail: string;
}

export interface OtpData {
  type?: 'otp';
  code: string;
  expiresInSec: number;
  issuedAt: number; // local timestamp ms
}

export interface DeviceTelemetry {
  type?: 'telemetry';
  rssi: number;
  uptimeSec: number;
  heap: number;
  servoAngle: number;
  ip?: string;
  lastPingMs?: number;
}

export interface RegisteredCard {
  uid: string;
  name: string;
  addedAt: number;
  lastAccess?: number;
  active: boolean;
}

export interface VaultSettings {
  deviceIp: string;
  apiToken: string;
  pin?: string;
  maxAttempts: number;
  lockoutSec: number;
  otpTtlSec: number;
  armed: boolean;
  demoMode: boolean;
  theme: 'dark' | 'light';
}

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'demo';

export interface IDeviceClient {
  connect(url?: string, token?: string): void;
  disconnect(): void;
  getStatus(): ConnectionStatus;
  
  onStateChange(cb: (state: VaultStatePayload) => void): () => void;
  onEvent(cb: (event: VaultEvent) => void): () => void;
  onOtp(cb: (otp: OtpData | null) => void): () => void;
  onTelemetry(cb: (telemetry: DeviceTelemetry) => void): () => void;
  onConnectionChange(cb: (status: ConnectionStatus) => void): () => void;

  lockNow(): Promise<boolean>;
  silenceAlarm(): Promise<boolean>;
  resetAlarm(): Promise<boolean>;
  
  startCardEnroll(): Promise<boolean>;
  cancelCardEnroll(): Promise<boolean>;
  deleteCard(uid: string): Promise<boolean>;
  addCard(card: RegisteredCard): Promise<boolean>;
  getCards(): Promise<RegisteredCard[]>;

  updateSettings(settings: Partial<VaultSettings>): Promise<boolean>;
  getLogs(limit?: number): Promise<VaultEvent[]>;
}
