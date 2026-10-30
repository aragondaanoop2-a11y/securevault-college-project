import React from 'react';
import { Search, Sun, Moon, Wifi, WifiOff, ShieldCheck, Cpu, LogOut } from 'lucide-react';
import { useVault } from '../../context/VaultContext';
import { AccountUser } from '../../context/AuthContext';
import { TEAM_NAME, APP_NAME } from '../../config/brand';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenSimulator: () => void;
  user: AccountUser;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ searchQuery, onSearchChange, onOpenSimulator, user, onSignOut }) => {
  const { status, isSimulator, reconnect, state } = useVault();
  const [isDark, setIsDark] = React.useState(true);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  };

  const getStatusBadge = () => {
    if (isSimulator) {
      return (
        <button
          onClick={onOpenSimulator}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-orange-500/20 to-pink-500/20 border border-orange-500/40 text-orange-300 hover:border-orange-400 transition"
          title="Click to toggle Interactive Hardware Simulator"
        >
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
          <span>Simulator Mode</span>
          <Cpu className="w-3.5 h-3.5 ml-0.5 text-orange-400" />
        </button>
      );
    }

    if (status === 'connected') {
      return (
        <button
          onClick={reconnect}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium accent-gradient-btn shadow-lg shadow-pink-500/20"
          title="ESP32 Connected. Click to test ping."
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping-slow"></span>
          <span className="font-semibold tracking-wide">Connected</span>
          <Wifi className="w-3.5 h-3.5" />
        </button>
      );
    }

    if (status === 'connecting') {
      return (
        <button
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-amber-500/20 border border-amber-500/40 text-amber-300"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-spin"></span>
          <span>Connecting...</span>
        </button>
      );
    }

    return (
      <button
        onClick={reconnect}
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-red-950/40 border border-red-500/30 text-red-300 hover:bg-red-900/40 transition"
        title="ESP32 Offline. Click to reconnect."
      >
        <WifiOff className="w-3.5 h-3.5 text-red-400" />
        <span>Connect</span>
      </button>
    );
  };

  return (
    <header className="w-full flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/[0.06] bg-[#0c070b]/60 backdrop-blur-md">
      {/* Mobile Title View */}
      <div className="flex md:hidden flex-col">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-orange-500 to-pink-500 flex items-center justify-center">
            <ShieldCheck className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-sm tracking-wide text-white">{APP_NAME}</span>
          {state.state === 'ALARM' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold animate-pulse">
              ALARM
            </span>
          )}
        </div>
        <span className="text-[9px] font-bold tracking-widest uppercase accent-text-gradient">
          {TEAM_NAME}
        </span>
      </div>

      {/* Shared team identity for both authenticated roles */}
      <div className="hidden md:flex flex-col min-w-max mr-2 leading-tight" aria-label={TEAM_NAME}>
        <span className="text-[9px] font-bold tracking-[.18em] uppercase accent-text-gradient">{TEAM_NAME}</span>
        <span className="text-[9px] text-neutral-500">{APP_NAME} control center</span>
      </div>

      {/* Desktop Search Bar */}
      <div className="hidden md:flex items-center relative w-72 lg:w-96">
        <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search logs, cards, events..."
          className="w-full bg-[#160d15]/80 text-xs text-neutral-200 placeholder-neutral-500 pl-10 pr-4 py-2 rounded-xl border border-white/[0.08] focus:outline-none focus:border-pink-500/60 focus:ring-1 focus:ring-pink-500/40 transition"
        />
      </div>

      {/* Right Actions: Theme Toggle + Status Pill + Simulator Quick Toggle */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 border-r border-white/[0.08] pr-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-400/10 text-[10px] font-bold text-emerald-200">
            {user.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="hidden lg:block">
            <div className="max-w-32 truncate text-[10px] font-semibold text-white">{user.name}</div>
            <div className="text-[8px] uppercase tracking-wider text-neutral-500">{user.role}</div>
          </div>
        </div>
        <button
          onClick={toggleTheme}
          aria-label="Toggle Theme"
          className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.08] transition"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {getStatusBadge()}
        <button onClick={onSignOut} aria-label="Sign out" title="Sign out" className="flex h-8 items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2.5 text-[10px] font-semibold text-neutral-300 transition hover:border-rose-300/20 hover:bg-rose-500/10 hover:text-rose-100">
          <LogOut className="h-3.5 w-3.5" /><span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
};
