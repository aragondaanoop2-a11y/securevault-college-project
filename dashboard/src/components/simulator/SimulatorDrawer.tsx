import React, { useState } from 'react';
import { 
  X, 
  Cpu, 
  Play, 
  CreditCard, 
  KeyRound, 
  Smartphone, 
  Radio, 
  AlertOctagon, 
  Sparkles, 
  CheckCircle2, 
  Flame,
  RotateCcw
} from 'lucide-react';
import { useVault } from '../../context/VaultContext';
import { TEAM_NAME } from '../../config/brand';

interface SimulatorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SimulatorDrawer: React.FC<SimulatorDrawerProps> = ({ isOpen, onClose }) => {
  const { 
    simulatorActions, 
    state, 
    otp, 
    isSimulator, 
    toggleDemoMode,
    cards 
  } = useVault();

  const [customPin, setCustomPin] = useState('1234');
  const [customOtp, setCustomOtp] = useState('');
  const [isAutomating, setIsAutomating] = useState(false);

  if (!isOpen) return null;

  const handleWalkthroughSuccess = async () => {
    if (!simulatorActions) return;
    setIsAutomating(true);
    await simulatorActions.autoWalkthroughSuccess();
    setIsAutomating(false);
  };

  const handleWalkthroughFail = async () => {
    if (!simulatorActions) return;
    setIsAutomating(true);
    await simulatorActions.autoWalkthroughFail();
    setIsAutomating(false);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0e070d]/95 backdrop-blur-2xl border-l border-white/[0.08] shadow-2xl flex flex-col justify-between p-5 overflow-y-auto">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  ESP32 Simulator Panel
                </h3>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 font-mono">
                  DEMO
                </span>
              </div>
              <p className="text-[10px] text-neutral-400">
                Interactive hardware event injector ({TEAM_NAME})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-neutral-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live State Mini Banner */}
        <div className="my-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase text-neutral-400 font-medium">State Machine</span>
            <div className="text-xs font-bold text-white mt-0.5 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                state.state === 'UNLOCKED' ? 'bg-emerald-400' :
                state.state === 'OTP_PENDING' ? 'bg-amber-400 animate-pulse' :
                state.state === 'ALARM' ? 'bg-rose-500 animate-ping' :
                'bg-orange-400'
              }`}></span>
              <span>{state.state} (Stage {state.stage}/4)</span>
            </div>
          </div>

          {state.state === 'OTP_PENDING' && otp && (
            <div className="text-right">
              <span className="text-[10px] uppercase text-pink-400 font-medium">Active OTP</span>
              <div className="text-xs font-mono font-extrabold text-white">
                {otp.code}
              </div>
            </div>
          )}
        </div>

        {/* 1-Click Presentations Walkthroughs */}
        <div className="flex flex-col gap-2.5 mb-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            1-Click Presentation Demos
          </span>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleWalkthroughSuccess}
              disabled={isAutomating || !simulatorActions}
              className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-gradient-to-r from-emerald-600/30 to-teal-600/20 border border-emerald-500/40 text-emerald-200 text-xs font-semibold hover:border-emerald-400 transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAutomating ? 'Running...' : 'Full Unlock Walkthrough'}</span>
            </button>

            <button
              onClick={handleWalkthroughFail}
              disabled={isAutomating || !simulatorActions}
              className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-gradient-to-r from-rose-600/30 to-red-600/20 border border-rose-500/40 text-rose-200 text-xs font-semibold hover:border-rose-400 transition"
            >
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
              <span>Fail -&gt; Lockout Demo</span>
            </button>
          </div>
        </div>

        {/* Step-by-Step Hardware Event Triggers */}
        <div className="flex flex-col gap-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300">
            Step-by-Step Sensor & Keypad Triggers
          </span>

          {/* Step 1: RFID */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-orange-400" />
                1. RFID Reader (MFRC522)
              </span>
              <span className="text-[10px] text-neutral-400">SPI GPIO 5,18,19,23</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                onClick={() => simulatorActions?.simulateRfidTap('04:A2:3B:89')}
                className="py-1.5 px-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] text-[11px] text-neutral-200 border border-white/[0.08]"
              >
                Tap Valid Tag (04:A2)
              </button>
              <button
                onClick={() => simulatorActions?.simulateRfidTap('DE:AD:BE:EF')}
                className="py-1.5 px-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-[11px] text-red-300 border border-red-500/20"
              >
                Tap Unknown Tag
              </button>
            </div>
          </div>

          {/* Step 2: Keypad PIN */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-pink-400" />
                2. Keypad PIN Entry
              </span>
              <span className="text-[10px] text-neutral-400">4x4 Matrix Keypad</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="password"
                maxLength={8}
                value={customPin}
                onChange={(e) => setCustomPin(e.target.value)}
                placeholder="PIN (1234)"
                className="w-24 bg-black/40 text-xs text-center font-mono py-1.5 rounded-lg border border-white/[0.08] text-white"
              />
              <button
                onClick={() => simulatorActions?.simulateKeypadPin(customPin)}
                className="flex-1 py-1.5 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 text-[11px] font-semibold border border-pink-500/30"
              >
                Submit PIN
              </button>
              <button
                onClick={() => simulatorActions?.simulateKeypadPin('9999')}
                className="py-1.5 px-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 text-[11px] border border-red-500/20"
              >
                Wrong PIN
              </button>
            </div>
          </div>

          {/* Step 3: Keypad OTP */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                3. Keypad OTP Entry
              </span>
              <span className="text-[10px] text-neutral-400">Generated by ESP32</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                maxLength={6}
                value={customOtp}
                onChange={(e) => setCustomOtp(e.target.value)}
                placeholder="6-Digit OTP"
                className="w-28 bg-black/40 text-xs text-center font-mono py-1.5 rounded-lg border border-white/[0.08] text-white"
              />
              <button
                onClick={() => {
                  const current = simulatorActions?.getSimulatorOtp();
                  if (current && simulatorActions) simulatorActions.simulateKeypadOtp(current);
                }}
                className="flex-1 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[11px] font-semibold border border-purple-500/30"
              >
                Auto-Fill & Submit
              </button>
              <button
                onClick={() => simulatorActions?.simulateKeypadOtp(customOtp || '000000')}
                className="py-1.5 px-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] text-[11px] text-neutral-200 border border-white/[0.08]"
              >
                Submit
              </button>
            </div>
          </div>

          {/* Tamper Sensor */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-rose-400" />
                PIR / Tilt Tamper Sensor
              </span>
              <p className="text-[10px] text-neutral-400">GPIO 34 (Hardware interrupt)</p>
            </div>
            <button
              onClick={() => simulatorActions?.simulateTamper()}
              className="py-1.5 px-3 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold border border-rose-500/40"
            >
              Trigger Tamper
            </button>
          </div>
        </div>
      </div>

      {/* Footer Mode Switcher */}
      <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] text-neutral-400 uppercase font-medium">Active Driver</span>
          <span className="text-xs font-bold text-white">MockDeviceClient</span>
        </div>
        <button
          onClick={() => {
            toggleDemoMode(false);
            onClose();
          }}
          className="text-xs text-neutral-400 hover:text-white underline underline-offset-2"
        >
          Switch to Real Hardware Mode
        </button>
      </div>
    </div>
  );
};
