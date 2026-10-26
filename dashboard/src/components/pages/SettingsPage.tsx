import React, { useState } from 'react';
import { Settings, Save, Shield, Cpu, KeyRound, Wifi, RefreshCw, Flame, Check } from 'lucide-react';
import { useVault } from '../../context/VaultContext';
import { TEAM_NAME, APP_NAME } from '../../config/brand';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, toggleDemoMode } = useVault();

  const [form, setForm] = useState({
    deviceIp: settings.deviceIp,
    apiToken: settings.apiToken,
    pin: settings.pin || '1234',
    maxAttempts: settings.maxAttempts,
    lockoutSec: settings.lockoutSec,
    otpTtlSec: settings.otpTtlSec,
    demoMode: settings.demoMode,
    armed: settings.armed
  });

  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          System & Security Settings
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
          Configure network endpoints, timing thresholds, and cryptographic credentials ({TEAM_NAME})
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Network & Connectivity Settings */}
        <div className="p-6 rounded-2xl glass-panel border border-white/[0.07] flex flex-col gap-4">
          <div className="flex items-center gap-2 text-pink-400 font-bold text-sm">
            <Wifi className="w-4 h-4" />
            <span>ESP32 Network Transport</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                Device IP or mDNS Hostname
              </label>
              <input
                type="text"
                value={form.deviceIp}
                onChange={(e) => setForm({ ...form, deviceIp: e.target.value })}
                placeholder="securevault.local or 192.168.1.xxx"
                className="w-full bg-[#160c14]/80 text-xs text-white px-3.5 py-2.5 rounded-xl border border-white/[0.08] focus:outline-none focus:border-pink-500/50 font-mono"
              />
              <span className="text-[10px] text-neutral-500 mt-1 block">Default: securevault.local</span>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                API Auth Token (<code className="text-pink-400">X-Vault-Token</code>)
              </label>
              <input
                type="password"
                value={form.apiToken}
                onChange={(e) => setForm({ ...form, apiToken: e.target.value })}
                placeholder="Token for HTTP & WebSocket auth"
                className="w-full bg-[#160c14]/80 text-xs text-white px-3.5 py-2.5 rounded-xl border border-white/[0.08] focus:outline-none focus:border-pink-500/50 font-mono"
              />
              <span className="text-[10px] text-neutral-500 mt-1 block">Protects REST endpoints against unauthorized access</span>
            </div>
          </div>

          {/* Demo Mode Toggle */}
          <div className="mt-2 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-white">Simulator / Demo Mode</span>
              <p className="text-[11px] text-neutral-400">
                Run built-in virtual ESP32 simulator with live state machine for demonstrations.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.demoMode}
                onChange={(e) => {
                  setForm({ ...form, demoMode: e.target.checked });
                  toggleDemoMode(e.target.checked);
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-pink-500 peer-checked:to-orange-500"></div>
            </label>
          </div>
        </div>

        {/* Security Rules & Timeouts */}
        <div className="p-6 rounded-2xl glass-panel border border-white/[0.07] flex flex-col gap-4">
          <div className="flex items-center gap-2 text-orange-400 font-bold text-sm">
            <Shield className="w-4 h-4" />
            <span>Lockout & Authentication Rules</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                Master Keypad PIN
              </label>
              <input
                type="password"
                maxLength={8}
                value={form.pin}
                onChange={(e) => setForm({ ...form, pin: e.target.value })}
                className="w-full bg-[#160c14]/80 text-xs text-white px-3.5 py-2.5 rounded-xl border border-white/[0.08] focus:outline-none focus:border-pink-500/50 font-mono"
              />
              <span className="text-[10px] text-neutral-500 mt-1 block">4-8 digits</span>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                Max Failed Attempts
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={form.maxAttempts}
                onChange={(e) => setForm({ ...form, maxAttempts: Number(e.target.value) })}
                className="w-full bg-[#160c14]/80 text-xs text-white px-3.5 py-2.5 rounded-xl border border-white/[0.08] focus:outline-none focus:border-pink-500/50 font-mono"
              />
              <span className="text-[10px] text-neutral-500 mt-1 block">Before lockout</span>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                Lockout Duration (sec)
              </label>
              <input
                type="number"
                min={10}
                max={600}
                value={form.lockoutSec}
                onChange={(e) => setForm({ ...form, lockoutSec: Number(e.target.value) })}
                className="w-full bg-[#160c14]/80 text-xs text-white px-3.5 py-2.5 rounded-xl border border-white/[0.08] focus:outline-none focus:border-pink-500/50 font-mono"
              />
              <span className="text-[10px] text-neutral-500 mt-1 block">Cooldown window</span>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                OTP Expiry TTL (sec)
              </label>
              <input
                type="number"
                min={15}
                max={300}
                value={form.otpTtlSec}
                onChange={(e) => setForm({ ...form, otpTtlSec: Number(e.target.value) })}
                className="w-full bg-[#160c14]/80 text-xs text-white px-3.5 py-2.5 rounded-xl border border-white/[0.08] focus:outline-none focus:border-pink-500/50 font-mono"
              />
              <span className="text-[10px] text-neutral-500 mt-1 block">Valid duration</span>
            </div>
          </div>
        </div>

        {/* Submit Button & Feedback */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                <Check className="w-3.5 h-3.5" />
                Settings saved successfully!
              </span>
            )}
          </div>

          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold accent-gradient-btn shadow-lg shadow-pink-500/20 min-h-[44px]"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>

      {/* Prominent Team Branding Footer on Settings Page */}
      <div className="mt-8 pt-8 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-3">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400" />
          <span>Designed & Engineered by</span>
          <span className="font-extrabold text-white uppercase tracking-wider accent-text-gradient">
            {TEAM_NAME}
          </span>
        </div>
        <span className="font-mono text-[11px]">
          SecureVault Release v1.2.0 • ESP32 + React PWA
        </span>
      </div>
    </div>
  );
};
