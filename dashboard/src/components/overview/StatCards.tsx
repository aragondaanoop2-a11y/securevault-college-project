import React from 'react';
import { Shield, AlertTriangle, Bell, CreditCard, Lock, Unlock, Siren, Clock } from 'lucide-react';
import { Sparkles } from '../common/Sparkles';
import { useVault } from '../../context/VaultContext';

export const StatCards: React.FC = () => {
  const { state, events, cards } = useVault();

  // Calculations
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const failedToday = events.filter(e => e.ts >= todayStart && (e.kind.includes('FAIL') || e.result === 'Failed')).length;
  const activeAlerts = events.filter(e => e.kind === 'TAMPER' || e.kind === 'LOCKOUT').length;

  const lastAccess = events.find(e => e.kind === 'UNLOCKED' || e.kind === 'RFID_OK')?.ts;
  const lastAccessStr = lastAccess 
    ? new Date(lastAccess).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'None today';

  // Status visual attributes
  const getStatusVisuals = () => {
    switch (state.state) {
      case 'UNLOCKED':
        return {
          label: 'UNLOCKED',
          colorText: 'text-emerald-400',
          dotBg: 'bg-emerald-400',
          subtext: 'Servo latched at 90°',
          icon: Unlock
        };
      case 'OTP_PENDING':
        return {
          label: 'OTP PENDING',
          colorText: 'text-amber-400',
          dotBg: 'bg-amber-400',
          subtext: 'Awaiting keypad entry',
          icon: Clock
        };
      case 'ALARM':
        return {
          label: 'ALARM ACTIVE',
          colorText: 'text-rose-500 animate-pulse',
          dotBg: 'bg-rose-500 animate-ping',
          subtext: 'Tamper / Motion triggered',
          icon: Siren
        };
      case 'LOCKOUT':
        return {
          label: `LOCKOUT (${state.lockoutRemainingSec}s)`,
          colorText: 'text-red-400',
          dotBg: 'bg-red-400',
          subtext: 'Temporary freeze',
          icon: Lock
        };
      case 'LOCKED':
      default:
        return {
          label: 'SECURE / LOCKED',
          colorText: 'text-orange-300',
          dotBg: 'bg-orange-400',
          subtext: 'Physical latch 0° engaged',
          icon: Lock
        };
    }
  };

  const statusVis = getStatusVisuals();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 w-full">
      {/* ================= CARD 1: BOX STATUS (ORANGE GLOW) ================= */}
      <div className="relative overflow-hidden rounded-2xl glass-card-orange p-4 sm:p-5 flex flex-col justify-between shadow-lg shadow-orange-950/20 group hover:border-orange-500/40 transition">
        <Sparkles />
        <div className="flex items-center justify-between mb-3">
          <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <statusVis.icon className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium text-orange-200/60 uppercase tracking-wider">
            Box Status
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${statusVis.dotBg}`}></span>
            <span className={`text-base sm:text-lg font-bold tracking-tight truncate ${statusVis.colorText}`}>
              {statusVis.label}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1 truncate">
            {statusVis.subtext}
          </p>
        </div>
      </div>

      {/* ================= CARD 2: FAILED ATTEMPTS (MAGENTA GLOW) ================= */}
      <div className="relative overflow-hidden rounded-2xl glass-card-magenta p-4 sm:p-5 flex flex-col justify-between shadow-lg shadow-pink-950/20 group hover:border-pink-500/40 transition">
        <Sparkles />
        <div className="flex items-center justify-between mb-3">
          <div className="w-8 h-8 rounded-full bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium text-pink-200/60 uppercase tracking-wider">
            Failed Attempts
          </span>
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {state.failedAttempts > 0 ? state.failedAttempts : failedToday}
            </span>
            <span className="text-xs text-pink-400 font-medium">
              / max {3}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1 truncate">
            {state.state === 'LOCKOUT' ? `Lockout: ${state.lockoutRemainingSec}s remaining` : 'Threshold: 3 failures'}
          </p>
        </div>
      </div>

      {/* ================= CARD 3: ACTIVE ALERTS (PURPLE GLOW) ================= */}
      <div className="relative overflow-hidden rounded-2xl glass-card-purple p-4 sm:p-5 flex flex-col justify-between shadow-lg shadow-purple-950/20 group hover:border-purple-500/40 transition">
        <Sparkles />
        <div className="flex items-center justify-between mb-3">
          <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Bell className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium text-purple-200/60 uppercase tracking-wider">
            Active Alerts
          </span>
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {activeAlerts}
            </span>
            <span className="text-xs text-purple-300 font-medium">
              {state.state === 'ALARM' ? 'CRITICAL' : 'Normal'}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1 truncate">
            {state.armed ? 'Tamper / Motion Armed' : 'Sensors Disarmed'}
          </p>
        </div>
      </div>

      {/* ================= CARD 4: REGISTERED CARDS (CYAN GLOW) ================= */}
      <div className="relative overflow-hidden rounded-2xl glass-card-cyan p-4 sm:p-5 flex flex-col justify-between shadow-lg shadow-cyan-950/20 group hover:border-cyan-500/40 transition">
        <Sparkles />
        <div className="flex items-center justify-between mb-3">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <CreditCard className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium text-cyan-200/60 uppercase tracking-wider">
            Registered Cards
          </span>
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {cards.length}
            </span>
            <span className="text-xs text-cyan-400 font-medium">
              Enrolled
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1 truncate">
            Last seen: {lastAccessStr}
          </p>
        </div>
      </div>
    </div>
  );
};
