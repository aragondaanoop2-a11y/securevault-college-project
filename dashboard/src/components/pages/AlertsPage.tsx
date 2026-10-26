import React from 'react';
import { AlertTriangle, Siren, ShieldAlert, Lock, CheckCircle2, RotateCcw } from 'lucide-react';
import { useVault } from '../../context/VaultContext';
import { TEAM_NAME } from '../../config/brand';

export const AlertsPage: React.FC = () => {
  const { events, resetAlarm, state } = useVault();

  // Filter alerts & security-critical events
  const securityAlerts = events.filter(e => 
    e.kind === 'TAMPER' || 
    e.kind === 'LOCKOUT' || 
    e.kind === 'PIN_FAIL' || 
    e.kind === 'RFID_FAIL' ||
    e.kind === 'OTP_FAIL'
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Security Incidents & Alerts
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            Real-time threat detection and perimeter defense timeline ({TEAM_NAME})
          </p>
        </div>

        {state.state === 'ALARM' && (
          <button
            onClick={resetAlarm}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition shadow-lg shadow-rose-500/30"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Active Alarm</span>
          </button>
        )}
      </div>

      {/* Active Siren Banner if in ALARM */}
      {state.state === 'ALARM' && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-950/80 via-red-900/60 to-rose-950/80 border border-rose-500/60 shadow-2xl flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center text-white">
              <Siren className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                CRITICAL PERIMETER BREACH DETECTED
              </h2>
              <p className="text-xs text-rose-200 mt-0.5">
                Physical motion or vibration detected while armed. Servo is locked to 0° fail-safe.
              </p>
            </div>
          </div>
          <button
            onClick={resetAlarm}
            className="px-4 py-2 rounded-xl bg-white text-rose-900 text-xs font-bold hover:bg-neutral-100 transition whitespace-nowrap"
          >
            Clear Alert
          </button>
        </div>
      )}

      {/* Alerts Timeline */}
      <div className="rounded-2xl glass-panel border border-white/[0.07] p-6 shadow-xl">
        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-5">
          Incident Event Stream
        </h3>

        {securityAlerts.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400/60 mb-2" />
            <p className="text-sm font-semibold text-white">No active or recorded security alerts</p>
            <p className="text-xs text-neutral-400 mt-1">Locker perimeter is secure and healthy.</p>
          </div>
        ) : (
          <div className="relative border-l border-white/[0.08] ml-4 space-y-6">
            {securityAlerts.map((alert) => {
              const isTamper = alert.kind === 'TAMPER';
              const isLockout = alert.kind === 'LOCKOUT';

              return (
                <div key={alert.id} className="relative pl-6">
                  {/* Dot on timeline */}
                  <div className={`absolute -left-2 top-1.5 w-4 h-4 rounded-full border-2 border-[#0a0608] flex items-center justify-center ${
                    isTamper ? 'bg-rose-500 animate-ping' :
                    isLockout ? 'bg-amber-400' :
                    'bg-red-400'
                  }`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold tracking-wide ${
                          isTamper ? 'text-rose-400' :
                          isLockout ? 'text-amber-400' :
                          'text-red-300'
                        }`}>
                          {alert.kind}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-neutral-300 font-mono">
                          Severity: {isTamper ? 'Critical' : isLockout ? 'High' : 'Warning'}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-300 mt-1">{alert.detail}</p>
                    </div>

                    <span className="text-[11px] font-mono text-neutral-400 shrink-0">
                      {new Date(alert.ts).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
