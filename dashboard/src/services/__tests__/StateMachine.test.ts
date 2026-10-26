import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MockDeviceClient } from '../MockDeviceClient';
import { TEAM_NAME } from '../../config/brand';

describe('SecureVault State Machine & Security Pipeline (TEAM FIGHT CLUB)', () => {
  let client: MockDeviceClient;

  beforeEach(() => {
    vi.useFakeTimers();
    client = new MockDeviceClient();
  });

  afterEach(() => {
    client.disconnect();
    vi.restoreAllMocks();
  });

  it('initializes in LOCKED state with stage 0 and TEAM FIGHT CLUB branding', () => {
    let capturedState: any;
    client.onStateChange((state) => {
      capturedState = state;
    });

    expect(capturedState.state).toBe('LOCKED');
    expect(capturedState.stage).toBe(0);
    expect(capturedState.failedAttempts).toBe(0);
    expect(capturedState.team).toBe(TEAM_NAME);
  });

  it('rejects unregistered RFID cards and logs failure', () => {
    let lastEvent: any;
    client.onEvent((e) => { lastEvent = e; });

    const ok = client.simulateRfidTap('FF:FF:FF:FF'); // unknown
    expect(ok).toBe(false);
    expect(lastEvent.kind).toBe('RFID_FAIL');
    expect(lastEvent.result).toBe('Failed');
  });

  it('executes full 4-stage layered verification: RFID -> PIN -> OTP -> UNLOCKED', () => {
    let currentState: any;
    client.onStateChange((s) => { currentState = s; });

    // Stage 1: Present valid card
    const rfidOk = client.simulateRfidTap('04:A2:3B:89');
    expect(rfidOk).toBe(true);
    expect(currentState.stage).toBe(1);

    // Stage 2: Enter PIN
    const pinOk = client.simulateKeypadPin('1234');
    expect(pinOk).toBe(true);
    expect(currentState.state).toBe('OTP_PENDING');
    expect(currentState.stage).toBe(2);

    // Stage 3: Retrieve and enter dynamic OTP
    const otp = client.getSimulatorOtp();
    expect(otp).toBeDefined();
    expect(otp?.length).toBe(6);

    const otpOk = client.simulateKeypadOtp(otp!);
    expect(otpOk).toBe(true);

    // Stage 4: Unlocked!
    expect(currentState.state).toBe('UNLOCKED');
    expect(currentState.stage).toBe(4);
    expect(currentState.failedAttempts).toBe(0);
  });

  it('auto-relocks after 10 seconds of unlocking', () => {
    let currentState: any;
    client.onStateChange((s) => { currentState = s; });

    // Complete unlock
    client.simulateRfidTap('04:A2:3B:89');
    client.simulateKeypadPin('1234');
    const otp = client.getSimulatorOtp();
    client.simulateKeypadOtp(otp!);

    expect(currentState.state).toBe('UNLOCKED');

    // Advance 10 seconds
    vi.advanceTimersByTime(10000);
    expect(currentState.state).toBe('LOCKED');
    expect(currentState.stage).toBe(0);
  });

  it('triggers LOCKOUT upon reaching 3 failed attempts', () => {
    let currentState: any;
    client.onStateChange((s) => { currentState = s; });

    // Fail 1
    client.simulateRfidTap('04:A2:3B:89');
    client.simulateKeypadPin('9999');
    expect(currentState.failedAttempts).toBe(1);

    // Fail 2
    client.simulateRfidTap('04:A2:3B:89');
    client.simulateKeypadPin('8888');
    expect(currentState.failedAttempts).toBe(2);

    // Fail 3 -> LOCKOUT!
    client.simulateRfidTap('04:A2:3B:89');
    client.simulateKeypadPin('7777');

    expect(currentState.state).toBe('LOCKOUT');
    expect(currentState.lockoutRemainingSec).toBe(30);

    // Additional interactions should be rejected during lockout
    const tapDuringLockout = client.simulateRfidTap('04:A2:3B:89');
    expect(tapDuringLockout).toBe(false);

    // After 30 seconds, cooldown expires
    vi.advanceTimersByTime(30000);
    expect(currentState.state).toBe('LOCKED');
    expect(currentState.failedAttempts).toBe(0);
  });

  it('triggers ALARM on tamper/motion detection and holds safe lock state', async () => {
    let currentState: any;
    client.onStateChange((s) => { currentState = s; });

    client.simulateTamper();
    expect(currentState.state).toBe('ALARM');

    // Reset alarm restores stand-by
    await client.resetAlarm();
    expect(currentState.state).toBe('LOCKED');
  });

  it('guarantees zero remote unlock capability', () => {
    // Assert that client interface has NO unlock method
    const clientAny = client as any;
    expect(clientAny.unlock).toBeUndefined();
    expect(clientAny.remoteUnlock).toBeUndefined();
    expect(clientAny.unlockNow).toBeUndefined();
  });
});
