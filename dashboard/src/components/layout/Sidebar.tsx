import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  CreditCard, 
  AlertTriangle, 
  Cpu, 
  Settings, 
  ShieldCheck, 
  Flame,
  KeyRound,
  Users
} from 'lucide-react';
import { TEAM_NAME, APP_NAME } from '../../config/brand';
import { useVault } from '../../context/VaultContext';

export type NavPage = 'overview' | 'logs' | 'cards' | 'alerts' | 'device' | 'settings' | 'users';

interface SidebarProps {
  currentPage: NavPage;
  onPageChange: (page: NavPage) => void;
  isAdmin?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange, isAdmin = false }) => {
  const { state, events } = useVault();

  const alertCount = events.filter(e => e.kind === 'TAMPER' || e.kind === 'LOCKOUT').length;

  const navItems = [
    { id: 'overview' as NavPage, label: 'Overview', icon: LayoutDashboard },
    { id: 'logs' as NavPage, label: 'Access Log', icon: FileText },
    { id: 'cards' as NavPage, label: 'Cards', icon: CreditCard },
    { id: 'alerts' as NavPage, label: 'Alerts', icon: AlertTriangle, badge: alertCount > 0 ? alertCount : undefined },
    { id: 'device' as NavPage, label: 'Device', icon: Cpu },
    { id: 'settings' as NavPage, label: 'Settings', icon: Settings },
    ...(isAdmin ? [{ id: 'users' as NavPage, label: 'Users', icon: Users }] : []),
  ];

  return (
    <>
      {/* ===================== DESKTOP SIDEBAR ===================== */}
      <aside className="hidden md:flex flex-col w-60 lg:w-64 border-r border-white/[0.06] bg-[#0c070b]/80 backdrop-blur-xl p-5 select-none shrink-0 justify-between">
        <div className="flex flex-col">
          {/* Logo & Team Branding */}
          <div className="flex flex-col mb-8 px-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 via-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/20">
                <ShieldCheck className="w-5 h-5 text-white stroke-[2.5]" />
              </div>
              <div>
                <span className="font-extrabold text-base tracking-wider text-white">
                  {APP_NAME.toUpperCase()}
                </span>
              </div>
            </div>
            {/* Prominent Team Name under logo */}
            <div className="mt-1.5 ml-12">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] accent-text-gradient">
                {TEAM_NAME}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-pink-500/15 to-orange-500/10 text-white border border-pink-500/30 shadow-sm shadow-pink-500/10 font-semibold'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-pink-400' : 'text-neutral-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/30 text-pink-300 border border-pink-500/40">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Team Badge */}
        <div className="pt-4 border-t border-white/[0.06] flex flex-col gap-2">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-pink-950/40 via-purple-950/30 to-black/60 border border-pink-500/20 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-pink-500/20 border border-pink-500/30 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4 text-pink-400" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-medium">Built by</span>
              <span className="text-xs font-bold text-white truncate accent-text-gradient">{TEAM_NAME}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ===================== MOBILE BOTTOM TAB BAR ===================== */}
      <nav 
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0c070b]/95 backdrop-blur-lg border-t border-white/[0.08] px-2 py-1 flex items-center justify-around safe-area-bottom shadow-2xl"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`flex flex-col items-center justify-center min-w-[50px] min-h-[44px] py-1 px-2 rounded-xl text-[10px] transition-all relative ${
                isActive
                  ? 'text-pink-400 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-4 h-4 ${isActive ? 'text-pink-400 scale-110' : 'text-neutral-400'}`} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>
                )}
              </div>
              <span className="mt-1">{item.label}</span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-pink-400 mt-0.5"></div>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
};
