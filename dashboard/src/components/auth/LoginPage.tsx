import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { TEAM_NAME } from '../../config/brand';

export const AuthBackdrop: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <main className="sv-auth-scene">
    <div className="sv-auth-glow sv-auth-glow-a" />
    <div className="sv-auth-glow sv-auth-glow-b" />
    <svg className="sv-auth-waves" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="sv-wave-teal" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#a3fff0" stopOpacity="0" />
          <stop offset="0.46" stopColor="#57efd2" stopOpacity=".75" />
          <stop offset="1" stopColor="#9b6cff" stopOpacity=".72" />
        </linearGradient>
        <linearGradient id="sv-wave-gold" x1="0" x2="1" y1="1" y2="0">
          <stop offset="0" stopColor="#ffb36d" stopOpacity="0" />
          <stop offset=".52" stopColor="#f2d77d" stopOpacity=".55" />
          <stop offset="1" stopColor="#65f3d6" stopOpacity=".38" />
        </linearGradient>
      </defs>
      <path className="sv-wave sv-wave-one" d="M-80 590 C 180 420 360 820 640 620 S 1030 260 1510 455" stroke="url(#sv-wave-teal)" />
      <path className="sv-wave sv-wave-two" d="M-100 650 C 200 500 380 890 720 650 S 1120 300 1510 380" stroke="url(#sv-wave-gold)" />
      <path className="sv-wave sv-wave-three" d="M-60 310 C 250 440 410 150 730 310 S 1110 590 1510 250" stroke="url(#sv-wave-teal)" />
      <path className="sv-wave sv-wave-four" d="M-40 370 C 200 500 470 190 760 355 S 1160 600 1490 295" stroke="url(#sv-wave-gold)" />
    </svg>
    <div className="sv-auth-noise" aria-hidden="true" />
    <div className="sv-auth-content">{children}</div>
  </main>
);

type AuthView = 'login' | 'forgot' | 'reset';

export const LoginPage: React.FC = () => {
  const { login, requestPasswordReset, resetPassword } = useAuth();
  const resetToken = useMemo(() => new URLSearchParams(window.location.search).get('reset') || '', []);
  const [view, setView] = useState<AuthView>(resetToken ? 'reset' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const goTo = (next: AuthView) => {
    setView(next);
    setError('');
    setNotice('');
  };

  const submitLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError('');
    try { await login(email, password, remember); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Sign in failed. Please try again.'); }
    finally { setBusy(false); }
  };

  const submitForgot = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try { setNotice(await requestPasswordReset(email)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not request a reset email.'); }
    finally { setBusy(false); }
  };

  const submitReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(''); setNotice('');
    if (newPassword.length < 12) { setError('Use at least 12 characters for your new password.'); return; }
    if (newPassword !== confirmPassword) { setError('The passwords do not match.'); return; }
    setBusy(true);
    try {
      setNotice(await resetPassword(resetToken, newPassword));
      window.history.replaceState({}, '', window.location.pathname);
      setPassword(''); setNewPassword(''); setConfirmPassword('');
      window.setTimeout(() => goTo('login'), 1200);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not reset the password.'); }
    finally { setBusy(false); }
  };

  const title = view === 'login' ? 'Welcome back' : view === 'forgot' ? 'Reset password' : 'Choose a new password';
  const subtitle = view === 'login'
    ? 'Secure access to your vault dashboard'
    : view === 'forgot'
      ? 'We’ll send a reset link to your account email'
      : 'Your new password must be at least 12 characters';

  return (
    <AuthBackdrop>
      <section className="sv-auth-card" aria-labelledby="auth-title">
        <div className="sv-auth-card-shine" />
        <div className="sv-auth-brand">
          <div className="sv-auth-brand-icon"><ShieldCheck size={21} strokeWidth={2.2} /></div>
          <span>SECURE<span className="sv-auth-brand-accent">VAULT</span></span>
        </div>
        <div className="sv-auth-heading">
          <p className="sv-auth-eyebrow">PRIVATE ACCESS</p>
          <h1 id="auth-title">{title}</h1>
          <p>{subtitle}</p>
        </div>

        {view === 'login' && (
          <form className="sv-auth-form" onSubmit={submitLogin}>
            <label className="sv-auth-label" htmlFor="auth-email">Email address</label>
            <div className="sv-auth-input-wrap">
              <input id="auth-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" />
              <UserRound size={18} aria-hidden="true" />
            </div>
            <div className="sv-auth-label-row"><label className="sv-auth-label" htmlFor="auth-password">Password</label></div>
            <div className="sv-auth-input-wrap">
              <input id="auth-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" />
              <button className="sv-auth-input-action" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <LockKeyhole size={18} />}</button>
            </div>
            <div className="sv-auth-options">
              <label className="sv-auth-remember"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /><span>Remember me</span></label>
              <button type="button" className="sv-auth-link" onClick={() => goTo('forgot')}>Forgot password?</button>
            </div>
            {error && <p className="sv-auth-message sv-auth-error" role="alert">{error}</p>}
            <button className="sv-auth-submit" type="submit" disabled={busy}>
              <span>{busy ? 'Signing in…' : 'Sign in'}</span>{busy ? <span className="sv-auth-spinner" /> : <ArrowRight size={18} />}
            </button>
            <p className="sv-auth-footnote"><span className="sv-auth-status-dot" /> Admin and user accounts sign in here</p>
          </form>
        )}

        {view === 'forgot' && (
          <form className="sv-auth-form" onSubmit={submitForgot}>
            <label className="sv-auth-label" htmlFor="reset-email">Account email</label>
            <div className="sv-auth-input-wrap">
              <input id="reset-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" />
              <Mail size={18} aria-hidden="true" />
            </div>
            {error && <p className="sv-auth-message sv-auth-error" role="alert">{error}</p>}
            {notice && <p className="sv-auth-message sv-auth-success" role="status">{notice}</p>}
            <button className="sv-auth-submit" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}{busy ? <span className="sv-auth-spinner" /> : <ArrowRight size={18} />}</button>
            <button type="button" className="sv-auth-back" onClick={() => goTo('login')}><ArrowLeft size={15} /> Back to sign in</button>
          </form>
        )}

        {view === 'reset' && (
          <form className="sv-auth-form" onSubmit={submitReset}>
            <label className="sv-auth-label" htmlFor="new-password">New password</label>
            <div className="sv-auth-input-wrap"><input id="new-password" type="password" autoComplete="new-password" minLength={12} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="At least 12 characters" /><KeyRound size={18} aria-hidden="true" /></div>
            <label className="sv-auth-label" htmlFor="confirm-password">Confirm new password</label>
            <div className="sv-auth-input-wrap"><input id="confirm-password" type="password" autoComplete="new-password" minLength={12} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Re-enter your password" /><LockKeyhole size={18} aria-hidden="true" /></div>
            {error && <p className="sv-auth-message sv-auth-error" role="alert">{error}</p>}
            {notice && <p className="sv-auth-message sv-auth-success" role="status">{notice}</p>}
            <button className="sv-auth-submit" type="submit" disabled={busy}>{busy ? 'Updating…' : 'Update password'}{busy ? <span className="sv-auth-spinner" /> : <ArrowRight size={18} />}</button>
          </form>
        )}
      </section>
      <p className="sv-auth-caption"><span>{TEAM_NAME}</span> <span>·</span> HARDWARE-ENFORCED SECURITY <span>·</span> {new Date().getFullYear()}</p>
    </AuthBackdrop>
  );
};

export const PasswordChangePage: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { user, changePassword, logout } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (password.length < 12) { setError('Use at least 12 characters.'); return; }
    if (password !== confirm) { setError('The passwords do not match.'); return; }
    setBusy(true);
    try { await changePassword(password); onComplete(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update password.'); }
    finally { setBusy(false); }
  };
  return (
    <AuthBackdrop>
      <section className="sv-auth-card" aria-labelledby="change-title">
        <div className="sv-auth-card-shine" />
        <div className="sv-auth-brand"><div className="sv-auth-brand-icon"><ShieldCheck size={21} /></div><span>SECURE<span className="sv-auth-brand-accent">VAULT</span></span></div>
        <div className="sv-auth-heading"><p className="sv-auth-eyebrow">FIRST SIGN IN</p><h1 id="change-title">Create your password</h1><p>Welcome, {user?.name}. Replace your temporary password to continue.</p></div>
        <form className="sv-auth-form" onSubmit={submit}>
          <label className="sv-auth-label" htmlFor="change-password">New password</label>
          <div className="sv-auth-input-wrap"><input id="change-password" type="password" autoComplete="new-password" minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 12 characters" /><KeyRound size={18} /></div>
          <label className="sv-auth-label" htmlFor="change-confirm">Confirm password</label>
          <div className="sv-auth-input-wrap"><input id="change-confirm" type="password" autoComplete="new-password" minLength={12} required value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Re-enter your password" /><LockKeyhole size={18} /></div>
          {error && <p className="sv-auth-message sv-auth-error" role="alert">{error}</p>}
          <button className="sv-auth-submit" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}{busy ? <span className="sv-auth-spinner" /> : <ArrowRight size={18} />}</button>
          <button type="button" className="sv-auth-back" onClick={() => void logout()}><ArrowLeft size={15} /> Sign out</button>
        </form>
      </section>
      <p className="sv-auth-caption">HARDWARE-ENFORCED SECURITY <span>·</span> {new Date().getFullYear()}</p>
    </AuthBackdrop>
  );
};
