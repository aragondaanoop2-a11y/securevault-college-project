import React, { useState, useMemo } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line 
} from 'recharts';
import { ChevronDown, Activity, Sparkles as SparklesIcon } from 'lucide-react';
import { useVault } from '../../context/VaultContext';

type TimeRange = '1h' | '24h' | '7d';

export const ActivityChart: React.FC = () => {
  const { events, state } = useVault();
  const [range, setRange] = useState<TimeRange>('24h');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Generate stepped time-series data mirroring reference visual style
  const chartData = useMemo(() => {
    // Standard stepped timeline points
    const pointsCount = range === '1h' ? 14 : range === '24h' ? 20 : 28;
    const now = Date.now();
    const interval = (range === '1h' ? 3600000 : range === '24h' ? 86400000 : 86400000 * 7) / pointsCount;

    const data = [];
    let currentSecurityLevel = 1; // 1 = Secure/Idle, 2 = Auth Active, 3 = OTP Verified, 4 = Unlocked, 0 = Tamper/Alarm

    for (let i = pointsCount - 1; i >= 0; i--) {
      const t = now - (i * interval);
      const date = new Date(t);
      const timeStr = range === '1h' 
        ? date.toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })
        : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Check if any real events happened near this bucket
      const matchedEvent = events.find(e => Math.abs(e.ts - t) < interval / 2);

      let val = currentSecurityLevel;
      let alertVal = 0;

      if (matchedEvent) {
        if (matchedEvent.kind === 'UNLOCKED') val = 4;
        else if (matchedEvent.kind === 'OTP_ISSUED' || matchedEvent.kind === 'OTP_OK') val = 3;
        else if (matchedEvent.kind === 'RFID_OK' || matchedEvent.kind === 'PIN_OK') val = 2;
        else if (matchedEvent.kind.includes('FAIL')) val = 1.5;
        else if (matchedEvent.kind === 'TAMPER' || matchedEvent.kind === 'LOCKOUT') {
          val = 0.5;
          alertVal = 4;
        }
      } else {
        // Natural subtle baseline stepped fluctuation like reference image
        const seed = (i * 17 + (range === '1h' ? 3 : 7)) % 10;
        if (seed > 7) val = 2.8;
        else if (seed > 4) val = 1.8;
        else if (seed > 2) val = 1.2;
        else val = 0.8;
      }

      currentSecurityLevel = val;

      data.push({
        time: timeStr,
        timestamp: t,
        activityLevel: val,
        baseline: val * 0.9,
        alert: alertVal,
        event: matchedEvent ? matchedEvent.kind : undefined
      });
    }

    // Append current live state if present
    if (state.state === 'UNLOCKED') {
      data[data.length - 1].activityLevel = 4;
    } else if (state.state === 'OTP_PENDING') {
      data[data.length - 1].activityLevel = 3;
    } else if (state.state === 'ALARM') {
      data[data.length - 1].activityLevel = 0.5;
      data[data.length - 1].alert = 4;
    }

    return data;
  }, [events, range, state]);

  const rangeLabels: Record<TimeRange, string> = {
    '1h': 'Last hour',
    '24h': 'Last 24 hours',
    '7d': 'Last 7 days'
  };

  return (
    <div className="w-full rounded-2xl glass-panel p-5 flex flex-col justify-between border border-white/[0.07] relative overflow-hidden shadow-xl">
      {/* Subtle background ambient glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-pink-500/[0.03] rounded-full blur-3xl pointer-events-none"></div>

      {/* Header with Title and Range Picker */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm sm:text-base font-semibold text-white tracking-wide">
            Activity
          </h2>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.06] text-neutral-400 font-mono">
            Live Stream
          </span>
        </div>

        {/* Custom Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#180e16] border border-white/[0.09] text-xs text-neutral-300 hover:text-white hover:border-white/20 transition shadow-inner"
          >
            <span>{rangeLabels[range]}</span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-36 rounded-xl bg-[#140c13] border border-white/10 shadow-2xl py-1 z-30 backdrop-blur-xl">
              {(['1h', '24h', '7d'] as TimeRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRange(r);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-1.5 text-xs transition ${
                    range === r ? 'text-pink-400 bg-pink-500/10 font-medium' : 'text-neutral-300 hover:bg-white/[0.04]'
                  }`}
                >
                  {rangeLabels[r]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stepped Chart Container */}
      <div className="w-full h-56 sm:h-64 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="steppedOrangeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#f97316" stop-opacity="0.35" />
                <stop offset="60%" stop-color="#ec4899" stop-opacity="0.08" />
                <stop offset="100%" stop-color="#0e080d" stop-opacity="0" />
              </linearGradient>
              <linearGradient id="steppedRedAlert" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#ef4444" stop-opacity="0.5" />
                <stop offset="100%" stop-color="#ef4444" stop-opacity="0" />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="time" 
              stroke="#525252" 
              fontSize={10} 
              tickLine={false} 
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.08)' }}
              interval="preserveStartEnd"
            />
            <YAxis 
              domain={[0, 5]} 
              ticks={[1, 2, 3, 4]}
              tickFormatter={(v) => v === 4 ? 'Unlocked' : v === 3 ? 'OTP' : v === 2 ? 'PIN' : 'Standby'}
              stroke="#525252" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-[#120a11]/95 border border-pink-500/30 p-2.5 rounded-xl shadow-2xl backdrop-blur-md">
                      <p className="text-[10px] text-neutral-400 font-mono">{data.time}</p>
                      <p className="text-xs font-bold text-white mt-0.5">
                        {data.activityLevel >= 4 ? 'Status: UNLOCKED' : data.activityLevel >= 3 ? 'Status: OTP PENDING' : data.activityLevel >= 2 ? 'Status: PIN VERIFIED' : 'Status: STANDBY / LOCKED'}
                      </p>
                      {data.event && (
                        <p className="text-[10px] text-pink-400 mt-1 font-semibold">Event: {data.event}</p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            {/* Primary stepped activity line */}
            <Area
              type="stepAfter"
              dataKey="activityLevel"
              stroke="#f97316"
              strokeWidth={2}
              fill="url(#steppedOrangeGrad)"
            />
            {/* Secondary warm accent line */}
            <Line
              type="stepAfter"
              dataKey="baseline"
              stroke="#ec4899"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Footer Indicator */}
      <div className="flex items-center justify-between text-[11px] text-neutral-400 border-t border-white/[0.05] pt-3 mt-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-orange-400 rounded-full"></span>
            <span>Authentication Stage</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-pink-500 rounded-full"></span>
            <span>Active State</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-mono text-neutral-400">
          <span>Non-blocking ESP32 Sync</span>
        </div>
      </div>
    </div>
  );
};
