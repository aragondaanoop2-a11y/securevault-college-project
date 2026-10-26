import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  ShieldAlert, 
  Clock, 
  Calendar 
} from 'lucide-react';
import { useVault } from '../../context/VaultContext';
import { TEAM_NAME } from '../../config/brand';

export const AccessLogPage: React.FC = () => {
  const { events } = useVault();
  const [filter, setFilter] = useState<'ALL' | 'Success' | 'Failed' | 'Blocked' | 'Tamper'>('ALL');
  const [search, setSearch] = useState('');

  const filteredLogs = useMemo(() => {
    return events.filter(e => {
      const matchFilter = filter === 'ALL' || e.result === filter;
      const matchSearch = !search || (
        e.kind.toLowerCase().includes(search.toLowerCase()) ||
        (e.uid && e.uid.toLowerCase().includes(search.toLowerCase())) ||
        e.detail.toLowerCase().includes(search.toLowerCase())
      );
      return matchFilter && matchSearch;
    });
  }, [events, filter, search]);

  const exportCSV = () => {
    const headers = ['Timestamp', 'Date/Time', 'Event Kind', 'Card UID', 'Stage', 'Result', 'Detail'];
    const rows = filteredLogs.map(e => [
      e.ts,
      new Date(e.ts).toISOString(),
      e.kind,
      e.uid || '',
      e.stage || 0,
      e.result || '',
      `"${e.detail.replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `securevault_access_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Security Access Logs
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            Immutable physical locker access audit stream ({TEAM_NAME})
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-neutral-200 border border-white/[0.08] transition self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-pink-400" />
          <span>Export Audit CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl glass-panel border border-white/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'Success', 'Failed', 'Blocked', 'Tamper'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                filter === tab
                  ? 'bg-gradient-to-r from-pink-500/20 to-orange-500/10 text-white border border-pink-500/30'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search records..."
            className="w-full bg-[#160c14]/80 text-xs text-white placeholder-neutral-500 pl-9 pr-3 py-2 rounded-xl border border-white/[0.08] focus:outline-none focus:border-pink-500/50"
          />
        </div>
      </div>

      {/* Log Entries List */}
      <div className="rounded-2xl glass-panel border border-white/[0.07] overflow-hidden shadow-xl">
        <div className="divide-y divide-white/[0.04]">
          {filteredLogs.length === 0 ? (
            <div className="p-10 text-center text-neutral-500 text-xs">
              No matching log records found.
            </div>
          ) : (
            filteredLogs.map(log => (
              <div key={log.id} className="p-4 hover:bg-white/[0.02] transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    log.result === 'Tamper' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                    log.result === 'Failed' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    log.result === 'Blocked' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {log.result === 'Tamper' ? <ShieldAlert className="w-4 h-4" /> :
                     log.result === 'Failed' ? <XCircle className="w-4 h-4" /> :
                     log.result === 'Blocked' ? <Clock className="w-4 h-4" /> :
                     <CheckCircle className="w-4 h-4" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white tracking-wide">{log.kind}</span>
                      {log.uid && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 font-mono font-semibold">
                          UID: {log.uid}
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.05] text-neutral-300 font-mono">
                        Stage {log.stage || 0}/4
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300 mt-1">{log.detail}</p>
                  </div>
                </div>

                <div className="text-right sm:shrink-0 font-mono text-[11px] text-neutral-400">
                  {new Date(log.ts).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
