import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  CreditCard, 
  Search, 
  Plus, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  ShieldAlert, 
  Clock, 
  Radio, 
  ArrowUpDown,
  Smartphone
} from 'lucide-react';
import { useVault } from '../../context/VaultContext';
import { VaultEvent, RegisteredCard } from '../../types/vault';

interface AccessTableProps {
  onOpenEnrollModal?: () => void;
}

export const AccessTable: React.FC<AccessTableProps> = ({ onOpenEnrollModal }) => {
  const { events, cards, deleteCard, enrollCard } = useVault();
  const [activeTab, setActiveTab] = useState<'logs' | 'cards'>('logs');
  const [search, setSearch] = useState('');
  const [sortAsc, setSortAsc] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  // Filtered & sorted logs
  const filteredLogs = useMemo(() => {
    return events
      .filter((e) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          e.kind.toLowerCase().includes(q) ||
          (e.uid && e.uid.toLowerCase().includes(q)) ||
          e.detail.toLowerCase().includes(q) ||
          (e.result && e.result.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => sortAsc ? a.ts - b.ts : b.ts - a.ts);
  }, [events, search, sortAsc]);

  // Filtered cards
  const filteredCards = useMemo(() => {
    return cards.filter((c) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.uid.toLowerCase().includes(q);
    });
  }, [cards, search]);

  const handleEnrollClick = async () => {
    setEnrolling(true);
    await enrollCard();
    setTimeout(() => setEnrolling(false), 5000);
  };

  const getResultBadge = (result?: string, kind?: string) => {
    if (kind === 'TAMPER' || result === 'Tamper') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
          <ShieldAlert className="w-3 h-3 text-rose-400" />
          Tamper
        </span>
      );
    }
    if (result === 'Blocked' || kind === 'LOCKOUT') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
          <Clock className="w-3 h-3 text-amber-400" />
          Blocked
        </span>
      );
    }
    if (result === 'Failed' || kind?.includes('FAIL')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
          <XCircle className="w-3 h-3 text-red-400" />
          Failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
        <CheckCircle className="w-3 h-3 text-emerald-400" />
        Success
      </span>
    );
  };

  return (
    <div className="w-full rounded-2xl glass-panel p-5 border border-white/[0.07] flex flex-col shadow-xl">
      {/* Top Bar: Tab Switcher (iVaults / PoL vaults style) + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
        {/* Pill switcher matching reference */}
        <div className="inline-flex p-1 rounded-2xl bg-[#140b12] border border-white/[0.08] self-start">
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'logs'
                ? 'bg-gradient-to-r from-pink-500/20 to-orange-500/10 text-white border border-pink-500/30 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Access Log</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/[0.08] text-neutral-300 font-mono">
              {events.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('cards')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'cards'
                ? 'bg-gradient-to-r from-pink-500/20 to-orange-500/10 text-white border border-pink-500/30 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Cards</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/[0.08] text-neutral-300 font-mono">
              {cards.length}
            </span>
          </button>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={activeTab === 'logs' ? "Filter events..." : "Filter card UIDs..."}
              className="w-full bg-[#160c14]/80 text-xs text-white placeholder-neutral-500 pl-9 pr-3 py-2 rounded-xl border border-white/[0.08] focus:outline-none focus:border-pink-500/50"
            />
          </div>

          {activeTab === 'cards' && (
            <button
              onClick={handleEnrollClick}
              disabled={enrolling}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold accent-gradient-btn shadow-md shadow-pink-500/20 whitespace-nowrap min-h-[44px] sm:min-h-0"
            >
              {enrolling ? <Radio className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{enrolling ? 'Tap Card Now...' : 'Enroll Card'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ===================== TAB 1: ACCESS LOG ===================== */}
      {activeTab === 'logs' && (
        <div className="w-full mt-2">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-neutral-400 font-medium text-[11px]">
                  <th 
                    className="py-3 px-3 cursor-pointer hover:text-white transition"
                    onClick={() => setSortAsc(!sortAsc)}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Time</span>
                      <ArrowUpDown className="w-3 h-3 text-neutral-500" />
                    </div>
                  </th>
                  <th className="py-3 px-3">Card UID</th>
                  <th className="py-3 px-3">Stage Reached</th>
                  <th className="py-3 px-3">Result</th>
                  <th className="py-3 px-3">Detail / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-neutral-500">
                      No matching access logs recorded.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((evt) => (
                    <tr key={evt.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 px-3 font-mono text-neutral-300 whitespace-nowrap">
                        {new Date(evt.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-neutral-200">
                        {evt.uid || <span className="text-neutral-500">—</span>}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-white/[0.05] text-neutral-300 font-mono text-[10px]">
                          Stage {evt.stage !== undefined ? evt.stage : 0} / 4
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {getResultBadge(evt.result, evt.kind)}
                      </td>
                      <td className="py-3 px-3 text-neutral-300 max-w-xs truncate" title={evt.detail}>
                        {evt.detail}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Card View (<768px) */}
          <div className="md:hidden flex flex-col gap-2.5 mt-3">
            {filteredLogs.length === 0 ? (
              <p className="py-6 text-center text-xs text-neutral-500">No logs found.</p>
            ) : (
              filteredLogs.slice(0, 15).map((evt) => (
                <div 
                  key={evt.id}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-neutral-400">
                      {new Date(evt.ts).toLocaleTimeString()}
                    </span>
                    {getResultBadge(evt.result, evt.kind)}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold text-neutral-200">
                      UID: {evt.uid || 'N/A'}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      Stage {evt.stage || 0}/4
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-300 mt-0.5">
                    {evt.detail}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB 2: REGISTERED CARDS ===================== */}
      {activeTab === 'cards' && (
        <div className="w-full mt-2">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-neutral-400 font-medium text-[11px]">
                  <th className="py-3 px-3">Card UID</th>
                  <th className="py-3 px-3">Label / Name</th>
                  <th className="py-3 px-3">Date Enrolled</th>
                  <th className="py-3 px-3">Last Access</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredCards.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-neutral-500">
                      No RFID tags enrolled yet. Tap "Enroll Card" to register.
                    </td>
                  </tr>
                ) : (
                  filteredCards.map((card) => (
                    <tr key={card.uid} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 px-3 font-mono font-bold text-orange-400">
                        {card.uid}
                      </td>
                      <td className="py-3 px-3 font-medium text-white">
                        {card.name}
                      </td>
                      <td className="py-3 px-3 text-neutral-400">
                        {new Date(card.addedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 text-neutral-400 font-mono">
                        {card.lastAccess ? new Date(card.lastAccess).toLocaleTimeString() : 'Never'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => deleteCard(card.uid)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition"
                          title="Revoke / Delete Card"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Card View (<768px) */}
          <div className="md:hidden flex flex-col gap-2.5 mt-3">
            {filteredCards.length === 0 ? (
              <p className="py-6 text-center text-xs text-neutral-500">No cards enrolled.</p>
            ) : (
              filteredCards.map((card) => (
                <div 
                  key={card.uid}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-xs text-white">{card.name}</span>
                    <span className="font-mono text-xs text-orange-400 mt-0.5">{card.uid}</span>
                    <span className="text-[10px] text-neutral-400 mt-1">
                      Enrolled: {new Date(card.addedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteCard(card.uid)}
                    className="p-2.5 rounded-xl text-neutral-400 hover:text-red-400 hover:bg-red-500/10 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label={`Revoke Card ${card.uid}`}
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
