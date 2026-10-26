import React from 'react';
import { ShieldAlert, ShieldCheck, RefreshCw, Zap, Radio } from 'lucide-react';
import { useVault } from '../../context/VaultContext';

export const TamperCard: React.FC = () => {
  const { state, events, resetAlarm, updateSettings, settings } = useVault();

  // Find last tamper event if any
  const lastTamper = events.find(e => e.kind === 'TAMPER');
  const lastTamperTime = lastTamper 
    ? new Date(lastTamper.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'None recorded';

  const isAlarm = state.state === 'ALARM';

  const handleToggleArmed = async () => {
    await updateSettings({ armed: !settings.armed });
  };

  return (
    <div className={`w-full rounded-2xl glass-panel p-5 border transition-all relative overflow-hidden shadow-xl ${
      isAlarm 
        ? 'border-rose-500/50 bg-gradient-to-br from-rose-950/40 via-[#180a12] to-[#0e070d]' 
        : 'border-white/[0.07]'
    }`}>
      {/* Header Banner matching iBERA in reference */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-md ${
            isAlarm 
              ? 'bg-rose-500 shadow-rose-500/40 animate-pulse' 
              : 'bg-gradient-to-tr from-purple-500 to-indigo-500 shadow-purple-500/20'
          }`}>
            {isAlarm ? <ShieldAlert className="w-4 h-4" /> : <Radio className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Tamper / Motion
            </h3>
            <p className="text-[10px] text-neutral-400">
              PIR & Tilt Sensor Guard
            </p>
          </div>
        </div>

        {/* Armed / Disarmed Pill Toggle */}
        <button
          onClick={handleToggleArmed}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition ${
            settings.armed
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-neutral-800 border-neutral-700 text-neutral-400'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${settings.armed ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'}`}></span>
          <span>{settings.armed ? 'ARMED' : 'DISARMED'}</span>
        </button>
      </div>

      {/* Sensor State Overview */}
      <div className="my-4 flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
        <div>
          <span className="text-[10px] uppercase font-medium text-neutral-400 tracking-wider">
            Sensor Reading
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`w-2.5 h-2.5 rounded-full ${isAlarm ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`}></span>
            <span className={`text-sm font-bold tracking-tight ${isAlarm ? 'text-rose-400 font-mono animate-pulse' : 'text-neutral-200'}`}>
              {isAlarm ? 'MOTION / TAMPER DETECTED' : 'CLEAR / SECURE'}
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase font-medium text-neutral-400 tracking-wider">
            Last Incident
          </span>
          <p className="text-xs font-mono text-neutral-300 mt-0.5">
            {lastTamperTime}
          </p>
        </div>
      </div>

      {/* Action footer */}
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
        <p className="text-[10px] text-neutral-400">
          Forces locker latch 0° lock state
        </p>
        <button
          onClick={resetAlarm}
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-neutral-200 border border-white/[0.08] transition"
        >
          <RefreshCw className="w-3.5 h-3.5 text-neutral-400" />
          <span>Reset Alarm</span>
        </button>
      </div>
    </div>
  );
};
