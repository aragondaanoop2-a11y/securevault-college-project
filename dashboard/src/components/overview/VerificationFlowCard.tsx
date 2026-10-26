import React, { useEffect, useState } from 'react';
import { 
  CreditCard, 
  KeyRound, 
  Smartphone, 
  Lock, 
  Unlock, 
  VolumeX, 
  ShieldAlert, 
  CheckCircle2, 
  Loader2 
} from 'lucide-react';
import { useVault } from '../../context/VaultContext';

export const VerificationFlowCard: React.FC = () => {
  const { state, otp, lockNow, silenceAlarm } = useVault();
  const [secondsLeft, setSecondsLeft] = useState(0);

  // Calculate remaining seconds for OTP countdown ring
  useEffect(() => {
    if (state.state !== 'OTP_PENDING' || !otp) {
      setSecondsLeft(0);
      return;
    }

    const updateTimer = () => {
      const elapsedSec = Math.floor((Date.now() - otp.issuedAt) / 1000);
      const remaining = Math.max(0, otp.expiresInSec - elapsedSec);
      setSecondsLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [state.state, otp]);

  // Steps definition
  const steps = [
    { num: 1, title: 'RFID Card', desc: 'Scan registered tag', icon: CreditCard },
    { num: 2, title: 'Keypad PIN', desc: 'Enter 4-digit code', icon: KeyRound },
    { num: 3, title: '6-Digit OTP', desc: 'Hardware-issued code', icon: Smartphone },
    { num: 4, title: 'Servo Latch', desc: '90° physical latch', icon: state.state === 'UNLOCKED' ? Unlock : Lock },
  ];

  const getStepStatus = (stepNum: number) => {
    if (state.state === 'UNLOCKED') return 'completed';
    if (state.state === 'ALARM' || state.state === 'LOCKOUT') return 'error';
    
    // Active stage tracking
    if (stepNum < state.stage + 1) return 'completed';
    if (stepNum === state.stage + 1) return 'active';
    return 'pending';
  };

  // Circular progress calculation
  const totalOtpSec = otp?.expiresInSec || 60;
  const progressRatio = totalOtpSec > 0 ? (secondsLeft / totalOtpSec) : 0;
  const strokeDashoffset = 100 - (progressRatio * 100);

  return (
    <div className="w-full rounded-2xl glass-panel p-5 border border-white/[0.07] flex flex-col justify-between relative overflow-hidden shadow-xl">
      {/* Top Header Banner matching iBGT in reference */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-pink-500/20">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Verification Flow
            </h3>
            <p className="text-[10px] text-neutral-400">
              4-Step Zero-Trust Hardware Pipeline
            </p>
          </div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase font-semibold ${
          state.state === 'UNLOCKED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
          state.state === 'OTP_PENDING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse' :
          state.state === 'ALARM' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
          'bg-white/[0.06] text-neutral-400 border border-white/[0.08]'
        }`}>
          {state.state}
        </span>
      </div>

      {/* 4-Step Pipeline Visual Tracker */}
      <div className="my-4 flex flex-col gap-2.5">
        {steps.map((st) => {
          const status = getStepStatus(st.num);
          const Icon = st.icon;

          return (
            <div
              key={st.num}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                status === 'completed'
                  ? 'bg-emerald-500/[0.08] border-emerald-500/30 text-emerald-300'
                  : status === 'active'
                  ? 'bg-gradient-to-r from-pink-500/20 to-orange-500/15 border-pink-500/40 text-white shadow-sm shadow-pink-500/10'
                  : status === 'error'
                  ? 'bg-red-500/[0.06] border-red-500/20 text-neutral-400 opacity-60'
                  : 'bg-white/[0.02] border-white/[0.04] text-neutral-400'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                    status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : status === 'active'
                      ? 'bg-gradient-to-tr from-orange-500 to-pink-500 text-white'
                      : 'bg-white/[0.06] text-neutral-400'
                  }`}
                >
                  {status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : status === 'active' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <span>{st.num}</span>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-white tracking-wide">{st.title}</p>
                  <p className="text-[10px] text-neutral-400">{st.desc}</p>
                </div>
              </div>

              <Icon className={`w-4 h-4 ${
                status === 'completed' ? 'text-emerald-400' :
                status === 'active' ? 'text-pink-400' : 'text-neutral-400'
              }`} />
            </div>
          );
        })}
      </div>

      {/* OTP Display Card with Animated Countdown Ring when OTP_PENDING */}
      {state.state === 'OTP_PENDING' && otp && (
        <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-pink-950/60 via-purple-950/50 to-orange-950/40 border border-pink-500/40 flex items-center justify-between shadow-lg shadow-pink-500/10">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-pink-300">
              <span className="w-2 h-2 rounded-full bg-pink-400 animate-ping"></span>
              <span>LIVE ONE-TIME PASSWORD</span>
            </div>
            <div className="text-2xl font-mono font-extrabold tracking-widest text-white mt-1">
              {otp.code}
            </div>
            <p className="text-[10px] text-neutral-400">
              Type on 4x4 keypad to unlock
            </p>
          </div>

          {/* Circular Countdown Ring */}
          <div className="relative w-12 h-12 flex items-center justify-center">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-white/[0.1]"
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-pink-500 transition-all duration-1000 ease-linear"
                strokeDasharray="100"
                strokeDashoffset={strokeDashoffset}
                strokeWidth="3"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-[11px] font-bold font-mono text-white">
              {secondsLeft}s
            </span>
          </div>
        </div>
      )}

      {/* Control Buttons (Strictly NO remote unlock button) */}
      <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/[0.06]">
        <button
          onClick={lockNow}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-neutral-200 border border-white/[0.08] transition"
        >
          <Lock className="w-3.5 h-3.5 text-neutral-400" />
          <span>Lock Now</span>
        </button>

        <button
          onClick={silenceAlarm}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-300 border border-rose-500/30 transition"
        >
          <VolumeX className="w-3.5 h-3.5 text-rose-400" />
          <span>Silence Alarm</span>
        </button>
      </div>
    </div>
  );
};
