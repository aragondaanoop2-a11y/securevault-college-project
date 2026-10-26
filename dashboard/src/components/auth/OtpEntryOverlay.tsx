import React, { useEffect, useRef, useState } from 'react';
import { Check, Clock3, KeyRound, ShieldCheck, Sparkles } from 'lucide-react';
import { useVault } from '../../context/VaultContext';
import { AuthBackdrop } from './LoginPage';

const OTP_LENGTH = 6;

export const OtpEntryOverlay: React.FC = () => {
  const { state, otp, isSimulator, simulatorActions } = useVault();
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const challengeActive = isSimulator && state.state === 'OTP_PENDING' && Boolean(otp);

  useEffect(() => {
    if (!challengeActive || !otp) {
      if (!showSuccess) {
        setDigits(Array(OTP_LENGTH).fill(''));
        setResult(null);
      }
      return;
    }
    setDigits(Array(OTP_LENGTH).fill(''));
    setResult(null);
    setVerifying(false);
    const timer = window.setTimeout(() => inputs.current[0]?.focus(), 220);
    return () => window.clearTimeout(timer);
  }, [challengeActive, otp?.issuedAt]);

  useEffect(() => {
    if (!challengeActive || !otp) { setSecondsLeft(0); return; }
    const update = () => setSecondsLeft(Math.max(0, otp.expiresInSec - Math.floor((Date.now() - otp.issuedAt) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [challengeActive, otp]);

  useEffect(() => {
    if (!showSuccess) return;
    const timer = window.setTimeout(() => setShowSuccess(false), 1900);
    return () => window.clearTimeout(timer);
  }, [showSuccess]);

  const writeAt = (index: number, raw: string) => {
    const value = raw.replace(/\D/g, '').slice(-1);
    setDigits((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
    setResult(null);
    if (value && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    event.preventDefault();
    setDigits(Array.from({ length: OTP_LENGTH }, (_, index) => pasted[index] || ''));
    inputs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const code = digits.join('');
    if (!simulatorActions || code.length !== OTP_LENGTH || verifying) return;
    setVerifying(true);
    setResult(null);
    await new Promise((resolve) => window.setTimeout(resolve, 720));
    const accepted = simulatorActions.simulateKeypadOtp(code);
    if (accepted) {
      setResult('success');
      setShowSuccess(true);
    } else {
      setResult('error');
      setDigits(Array(OTP_LENGTH).fill(''));
      window.setTimeout(() => inputs.current[0]?.focus(), 40);
    }
    setVerifying(false);
  };

  if (!challengeActive && !showSuccess) return null;

  return (
    <AuthBackdrop>
      <section className={`sv-auth-card sv-otp-card ${result === 'success' ? 'sv-otp-success-card' : ''}`} aria-labelledby="otp-title">
        <div className="sv-auth-card-shine" />
        <div className="sv-otp-icon"><KeyRound size={21} /></div>
        <div className="sv-auth-heading sv-otp-heading">
          <p className="sv-auth-eyebrow">SECOND-LAYER VERIFICATION</p>
          <h1 id="otp-title">{result === 'success' ? 'Identity verified' : 'Verify your OTP'}</h1>
          <p>{result === 'success' ? 'The vault has been unlocked in the simulator.' : 'Enter the 6-digit security code to continue'}</p>
        </div>

        {result === 'success' ? (
          <div className="sv-otp-complete" role="status">
            <div className="sv-otp-success-ring"><Check size={28} /></div>
            <span>SECURE CONNECTION CONFIRMED</span>
            <div className="sv-otp-sparks"><Sparkles size={17} /><Sparkles size={13} /><Sparkles size={15} /></div>
          </div>
        ) : (
          <form className="sv-otp-form" onSubmit={submit}>
            <div className={`sv-otp-digits ${result === 'error' ? 'sv-otp-shake' : ''}`} onPaste={handlePaste}>
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => { inputs.current[index] = element; }}
                  className={`sv-otp-digit ${digit ? 'sv-otp-digit-filled' : ''}`}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  aria-label={`OTP digit ${index + 1}`}
                  maxLength={1}
                  value={digit}
                  onChange={(event) => writeAt(index, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Backspace' && !digits[index] && index > 0) inputs.current[index - 1]?.focus();
                    if (event.key === 'ArrowLeft' && index > 0) inputs.current[index - 1]?.focus();
                    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
                  }}
                  disabled={verifying || secondsLeft === 0}
                />
              ))}
            </div>

            <div className="sv-otp-countdown">
              <Clock3 size={14} />
              <span>{secondsLeft > 0 ? `Code expires in 00:${String(secondsLeft).padStart(2, '0')}` : 'This code has expired'}</span>
              {secondsLeft > 0 && <span className="sv-otp-countdown-dot" />}
            </div>

            {result === 'error' && <p className="sv-otp-error" role="alert">That code was not accepted. Try again before it expires.</p>}
            {secondsLeft === 0 && <p className="sv-otp-error" role="alert">The simulator code expired. Restart the verification flow to get a new one.</p>}

            <button className="sv-otp-submit" type="submit" disabled={verifying || digits.join('').length !== OTP_LENGTH || secondsLeft === 0}>
              {verifying ? <><span className="sv-otp-button-pulse" /> Verifying code…</> : <><ShieldCheck size={16} /> Verify code</>}
            </button>

            <div className="sv-otp-demo-note"><span className="sv-otp-demo-dot" /> Simulator code <strong>{otp?.code || '••••••'}</strong></div>
            <p className="sv-otp-live-note">This animated web entry is for the simulator. With the physical ESP32, enter the code on its keypad.</p>
          </form>
        )}
      </section>
      <p className="sv-auth-caption">SECUREVAULT VERIFICATION <span>·</span> 6-DIGIT ONE-TIME CODE</p>
    </AuthBackdrop>
  );
};
