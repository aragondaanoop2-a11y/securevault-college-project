import React, { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Loader2, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { ManagedAccount, useAuth } from '../../context/AuthContext';

export const UsersPage: React.FC = () => {
  const { listUsers, createUser, setUserActive } = useAuth();
  const [users, setUsers] = useState<ManagedAccount[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setUsers(await listUsers()); setError(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load accounts.'); }
    finally { setLoading(false); }
  }, [listUsers]);

  useEffect(() => { void refresh(); }, [refresh]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage(''); setTemporaryPassword('');
    try {
      const result = await createUser(name.trim(), email.trim());
      setUsers((current) => [result.user, ...current]);
      setTemporaryPassword(result.temporaryPassword);
      setMessage(`Account created for ${result.user.email}. Share its temporary password privately.`);
      setName(''); setEmail('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create the account.'); }
    finally { setBusy(false); }
  };

  const toggleAccount = async (account: ManagedAccount) => {
    try {
      const updated = await setUserActive(account.id, !account.active);
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
      setMessage(updated.active ? `${updated.name} can sign in again.` : `${updated.name} has been deactivated.`);
      setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update this account.'); }
  };

  const copyPassword = async () => {
    try { await navigator.clipboard.writeText(temporaryPassword); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }
    catch { setError('Clipboard access was blocked. Select and copy the temporary password.'); }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 pb-10">
      <div>
        <div className="flex items-center gap-2"><Users className="h-5 w-5 text-pink-300" /><h1 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">User accounts</h1></div>
        <p className="mt-1 text-xs text-neutral-400">Create and manage access for people who need the SecureVault dashboard.</p>
      </div>

      <section className="glass-panel rounded-2xl border border-white/[0.08] p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-pink-400/20 bg-pink-500/10 text-pink-300"><UserPlus size={17} /></div>
          <div><h2 className="text-sm font-bold text-white">Add a dashboard user</h2><p className="mt-0.5 text-[11px] text-neutral-400">New users will set their own password at first sign-in.</p></div>
        </div>
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1.2fr_auto] sm:items-end">
          <label className="flex flex-col gap-1.5 text-[10px] font-semibold text-neutral-300">Full name
            <input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" className="rounded-xl border border-white/10 bg-black/20 px-3.5 py-3 text-xs text-white outline-none transition placeholder:text-neutral-600 focus:border-pink-400/50" />
          </label>
          <label className="flex flex-col gap-1.5 text-[10px] font-semibold text-neutral-300">Email address
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="person@example.com" className="rounded-xl border border-white/10 bg-black/20 px-3.5 py-3 text-xs text-white outline-none transition placeholder:text-neutral-600 focus:border-pink-400/50" />
          </label>
          <button type="submit" disabled={busy} className="flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-pink-300/20 bg-gradient-to-r from-pink-500/80 to-orange-500/80 px-5 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}{busy ? 'Creating…' : 'Add user'}
          </button>
        </form>

        {temporaryPassword && (
          <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-500/[0.07] p-4">
            <p className="text-xs font-bold text-amber-100">Temporary password — shown once</p>
            <p className="mt-1 text-[10px] text-neutral-400">Share this privately with the new user. They must change it when they sign in.</p>
            <div className="mt-3 flex items-center gap-2">
              <code className="min-w-0 flex-1 select-all break-all rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-xs text-white">{temporaryPassword}</code>
              <button type="button" onClick={() => void copyPassword()} aria-label="Copy temporary password" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-neutral-200 transition hover:bg-white/10">{copied ? <Check size={16} className="text-emerald-300" /> : <Copy size={16} />}</button>
            </div>
          </div>
        )}

        {message && <p className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-500/[0.07] px-3 py-2 text-[11px] text-emerald-200" role="status">{message}</p>}
        {error && <p className="mt-3 rounded-lg border border-rose-400/20 bg-rose-500/[0.07] px-3 py-2 text-[11px] text-rose-200" role="alert">{error}</p>}
      </section>

      <section className="glass-panel overflow-hidden rounded-2xl border border-white/[0.08]">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-300" /><h2 className="text-xs font-bold text-white">Access list</h2><span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] text-neutral-400">{users.length}</span></div>
          <button onClick={() => void refresh()} className="text-[10px] font-semibold text-neutral-400 transition hover:text-white">Refresh</button>
        </div>
        {loading ? <div className="flex items-center justify-center gap-2 p-10 text-xs text-neutral-400"><Loader2 size={15} className="animate-spin" /> Loading accounts…</div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-left">
              <thead className="bg-white/[0.025] text-[9px] uppercase tracking-[0.16em] text-neutral-500"><tr><th className="px-5 py-3 font-semibold">Account</th><th className="px-5 py-3 font-semibold">Role</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3 text-right font-semibold">Access</th></tr></thead>
              <tbody className="divide-y divide-white/[0.05]">
                {users.map((account) => (
                  <tr key={account.id} className="transition hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5"><div className="text-xs font-semibold text-white">{account.name}</div><div className="mt-1 text-[10px] text-neutral-500">{account.email}</div></td>
                    <td className="px-5 py-3.5"><span className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${account.role === 'admin' ? 'border-pink-400/20 bg-pink-500/10 text-pink-200' : 'border-white/10 bg-white/[0.04] text-neutral-300'}`}>{account.role}</span></td>
                    <td className="px-5 py-3.5"><span className={`inline-flex items-center gap-1.5 text-[10px] ${account.active ? 'text-emerald-300' : 'text-neutral-500'}`}><span className={`h-1.5 w-1.5 rounded-full ${account.active ? 'bg-emerald-400' : 'bg-neutral-600'}`} />{account.active ? 'Active' : 'Disabled'}</span></td>
                    <td className="px-5 py-3.5 text-right">{account.role === 'admin' ? <span className="text-[10px] text-neutral-600">Protected</span> : <button type="button" onClick={() => void toggleAccount(account)} className={`rounded-lg border px-3 py-1.5 text-[10px] font-semibold transition ${account.active ? 'border-rose-400/15 text-rose-200 hover:bg-rose-500/10' : 'border-emerald-400/15 text-emerald-200 hover:bg-emerald-500/10'}`}>{account.active ? 'Disable' : 'Enable'}</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
