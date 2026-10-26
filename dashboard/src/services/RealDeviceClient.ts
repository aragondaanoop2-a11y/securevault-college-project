/**
 * Real ESP32 Device Client (WebSocket + REST)
 * TEAM FIGHT CLUB
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

export class RealDeviceClient implements IDeviceClient {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private reconnectTimeout: any = null;
  private backoffMs = 1000;
  private maxBackoffMs = 16000;
  private shouldReconnect = true;

  private deviceHost = 'securevault.local';
  private token = '';

  private stateSubscribers: Set<(state: VaultStatePayload) => void> = new Set();
  private eventSubscribers: Set<(event: VaultEvent) => void> = new Set();
  private otpSubscribers: Set<(otp: OtpData | null) => void> = new Set();
  private telemetrySubscribers: Set<(telemetry: DeviceTelemetry) => void> = new Set();
  private connectionSubscribers: Set<(status: ConnectionStatus) => void> = new Set();

  private lastState: VaultStatePayload | null = null;
  private lastOtp: OtpData | null = null;

  constructor(host?: string, token?: string) {
    if (host) this.deviceHost = host;
    if (token) this.token = token;
  }

  public connect(host?: string, token?: string): void {
    if (host) this.deviceHost = host;
    if (token) this.token = token;
    this.shouldReconnect = true;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus('connecting');

    // Strip http:// or ws:// prefix if present
    let cleanHost = this.deviceHost.replace(/^(http:\/\/|https:\/\/|ws:\/\/|wss:\/\/)/, '').replace(/\/.*$/, '');
    const wsUrl = `ws://${cleanHost}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.setStatus('connected');
        this.backoffMs = 1000;
        // Authenticate connection or fetch initial state
        this.fetchInitialState();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleIncomingMessage(data);
        } catch (err) {
          console.error('[SecureVault WS] Failed to parse message:', event.data, err);
        }
      };

      this.ws.onclose = () => {
        this.setStatus('disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('[SecureVault WS] Socket error:', err);
        this.ws?.close();
      };
    } catch (err) {
      console.warn('[SecureVault WS] Connection creation failed:', err);
      this.setStatus('disconnected');
      this.scheduleReconnect();
    }
  }

  public disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.connectionSubscribers.forEach(cb => cb(status));
    }
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) return;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

    this.reconnectTimeout = setTimeout(() => {
      this.backoffMs = Math.min(this.backoffMs * 1.5, this.maxBackoffMs);
      this.connect();
    }, this.backoffMs);
  }

  private handleIncomingMessage(msg: any): void {
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case 'state':
        this.lastState = msg as VaultStatePayload;
        this.stateSubscribers.forEach(cb => cb(this.lastState!));
        break;

      case 'event':
        const event = msg as VaultEvent;
        if (!event.id) event.id = `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        this.eventSubscribers.forEach(cb => cb(event));
        break;

      case 'otp':
        this.lastOtp = {
          type: 'otp',
          code: msg.code,
          expiresInSec: msg.expiresInSec || 60,
          issuedAt: Date.now()
        };
        this.otpSubscribers.forEach(cb => cb(this.lastOtp));
        break;

      case 'telemetry':
        const telemetry = msg as DeviceTelemetry;
        this.telemetrySubscribers.forEach(cb => cb(telemetry));
        break;
    }
  }

  private getRestBase(): string {
    const cleanHost = this.deviceHost.replace(/^(http:\/\/|https:\/\/|ws:\/\/|wss:\/\/)/, '').replace(/\/.*$/, '');
    return `http://${cleanHost}`;
  }

  private async apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.getRestBase()}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-Vault-Token': this.token,
      ...(options.headers || {})
    };
    return fetch(url, { ...options, headers });
  }

  private async fetchInitialState(): Promise<void> {
    try {
      const res = await this.apiFetch('/api/state');
      if (res.ok) {
        const state = await res.json();
        this.handleIncomingMessage({ type: 'state', ...state });
      }
    } catch {
      // Ignored if network error on boot
    }
  }

  // --- Subscriptions ---
  public onStateChange(cb: (state: VaultStatePayload) => void): () => void {
    this.stateSubscribers.add(cb);
    if (this.lastState) cb(this.lastState);
    return () => this.stateSubscribers.delete(cb);
  }

  public onEvent(cb: (event: VaultEvent) => void): () => void {
    this.eventSubscribers.add(cb);
    return () => this.eventSubscribers.delete(cb);
  }

  public onOtp(cb: (otp: OtpData | null) => void): () => void {
    this.otpSubscribers.add(cb);
    cb(this.lastOtp);
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

  // --- Commands ---
  public async lockNow(): Promise<boolean> {
    try {
      const res = await this.apiFetch('/api/lock', { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async silenceAlarm(): Promise<boolean> {
    try {
      const res = await this.apiFetch('/api/alarm/silence', { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async resetAlarm(): Promise<boolean> {
    try {
      const res = await this.apiFetch('/api/alarm/reset', { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async startCardEnroll(): Promise<boolean> {
    try {
      const res = await this.apiFetch('/api/cards/enroll', { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async cancelCardEnroll(): Promise<boolean> {
    try {
      const res = await this.apiFetch('/api/cards/enroll/cancel', { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async deleteCard(uid: string): Promise<boolean> {
    try {
      const res = await this.apiFetch(`/api/cards/${encodeURIComponent(uid)}`, { method: 'DELETE' });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async addCard(card: RegisteredCard): Promise<boolean> {
    try {
      const res = await this.apiFetch('/api/cards', { 
        method: 'POST',
        body: JSON.stringify(card)
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async getCards(): Promise<RegisteredCard[]> {
    try {
      const res = await this.apiFetch('/api/cards');
      if (res.ok) return await res.json();
    } catch {}
    return [];
  }

  public async updateSettings(settings: Partial<VaultSettings>): Promise<boolean> {
    try {
      const res = await this.apiFetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify(settings)
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async getLogs(limit: number = 100): Promise<VaultEvent[]> {
    try {
      const res = await this.apiFetch(`/api/log?limit=${limit}`);
      if (res.ok) return await res.json();
    } catch {}
    return [];
  }
}
