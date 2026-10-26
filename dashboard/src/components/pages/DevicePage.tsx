import React from 'react';
import { Cpu, Wifi, HardDrive, Clock, Shield, Sliders, CheckCircle, Radio } from 'lucide-react';
import { useVault } from '../../context/VaultContext';
import { TEAM_NAME } from '../../config/brand';

export const DevicePage: React.FC = () => {
  const { telemetry, state, settings, status } = useVault();

  // Uptime formatting
  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  const heapMb = (telemetry.heap / 1024).toFixed(1);

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          ESP32 Hardware Telemetry
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
          Microcontroller diagnostics and peripheral bus telemetry ({TEAM_NAME})
        </p>
      </div>

      {/* Primary Hardware Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* IP & Status */}
        <div className="p-5 rounded-2xl glass-panel border border-white/[0.07] flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium uppercase tracking-wider">Device Endpoint</span>
            <Wifi className="w-4 h-4 text-pink-400" />
          </div>
          <div className="my-3">
            <div className="text-lg font-mono font-bold text-white truncate">
              {settings.deviceIp}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-400' : 'bg-orange-400 animate-pulse'}`}></span>
              <span className="text-xs text-neutral-300 capitalize">{status}</span>
              <span className="text-[10px] text-neutral-500 font-mono">({telemetry.lastPingMs || 14}ms)</span>
            </div>
          </div>
          <span className="text-[10px] text-neutral-400">Port 80 HTTP / WS 80</span>
        </div>

        {/* Wi-Fi RSSI */}
        <div className="p-5 rounded-2xl glass-panel border border-white/[0.07] flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium uppercase tracking-wider">Wi-Fi Signal</span>
            <Radio className="w-4 h-4 text-orange-400" />
          </div>
          <div className="my-3">
            <div className="text-2xl font-extrabold text-white">
              {telemetry.rssi} <span className="text-xs font-normal text-neutral-400">dBm</span>
            </div>
            <p className="text-xs text-emerald-400 font-medium mt-1">Excellent (2.4 GHz 802.11 b/g/n)</p>
          </div>
          <div className="w-full bg-white/[0.08] h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-orange-500 to-pink-500 h-full rounded-full" 
              style={{ width: `${Math.min(100, Math.max(10, 100 - (Math.abs(telemetry.rssi) - 30) * 1.5))}%` }}
            ></div>
          </div>
        </div>

        {/* Free Heap */}
        <div className="p-5 rounded-2xl glass-panel border border-white/[0.07] flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium uppercase tracking-wider">Free Heap RAM</span>
            <HardDrive className="w-4 h-4 text-purple-400" />
          </div>
          <div className="my-3">
            <div className="text-2xl font-extrabold text-white">
              {heapMb} <span className="text-xs font-normal text-neutral-400">KB</span>
            </div>
            <p className="text-xs text-neutral-300 mt-1">SRAM: {telemetry.heap} bytes free</p>
          </div>
          <span className="text-[10px] text-neutral-400">Zero heap fragmentation</span>
        </div>

        {/* Uptime */}
        <div className="p-5 rounded-2xl glass-panel border border-white/[0.07] flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium uppercase tracking-wider">System Uptime</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="my-3">
            <div className="text-xl font-mono font-extrabold text-white">
              {formatUptime(telemetry.uptimeSec)}
            </div>
            <p className="text-xs text-neutral-300 mt-1">Continuous operation</p>
          </div>
          <span className="text-[10px] text-neutral-400">Reset source: Power-on</span>
        </div>
      </div>

      {/* Actuator & Firmware Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Actuator Physical Status */}
        <div className="p-6 rounded-2xl glass-panel border border-white/[0.07]">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-pink-400" />
            Servo Latch & Actuator Angle
          </h3>

          <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] mb-4">
            <div>
              <span className="text-[10px] uppercase text-neutral-400 font-mono">Current Position</span>
              <div className="text-3xl font-extrabold text-white mt-0.5">
                {state.state === 'UNLOCKED' ? '90°' : '0°'}
              </div>
              <p className="text-xs text-neutral-300 mt-1">
                {state.state === 'UNLOCKED' ? 'UNLATCHED (Door Open)' : 'LATCHED (Deadbolt engaged)'}
              </p>
            </div>

            <div className="w-20 h-20 rounded-full border-4 border-white/[0.08] relative flex items-center justify-center">
              <div 
                className="w-1 h-8 bg-gradient-to-t from-pink-500 to-orange-400 rounded-full origin-bottom transition-all duration-500 ease-out absolute bottom-1/2"
                style={{ transform: `rotate(${state.state === 'UNLOCKED' ? 90 : 0}deg)` }}
              ></div>
              <div className="w-3 h-3 rounded-full bg-white shadow-lg"></div>
            </div>
          </div>

          <p className="text-xs text-neutral-400">
            Driven by ESP32 hardware PWM timer on GPIO15. Powered by dedicated 5V regulated rail.
          </p>
        </div>

        {/* Peripheral Bus & Pin Mapping */}
        <div className="p-6 rounded-2xl glass-panel border border-white/[0.07]">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-orange-400" />
            Hardware Bus Allocation
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
              <span className="text-neutral-300 font-medium">MFRC522 RFID (SPI)</span>
              <span className="font-mono text-orange-400">SS:5, SCK:18, MOSI:23, MISO:19, RST:22</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
              <span className="text-neutral-300 font-medium">4x4 Matrix Keypad</span>
              <span className="font-mono text-pink-400">Rows: 32,33,25,26 | Cols: 27,14,12,13</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
              <span className="text-neutral-300 font-medium">SG90 / MG90S Latch Servo</span>
              <span className="font-mono text-purple-400">GPIO 15 (PWM)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
              <span className="text-neutral-300 font-medium">PIR Tamper Sensor</span>
              <span className="font-mono text-cyan-400">GPIO 34 (Input-only)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
              <span className="text-neutral-300 font-medium">Active Buzzer & LED</span>
              <span className="font-mono text-neutral-300">Buzzer: GPIO 4 | LED: GPIO 2</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-neutral-400">
            <span>Firmware: v1.2.0</span>
            <span className="accent-text-gradient font-bold">{TEAM_NAME}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
