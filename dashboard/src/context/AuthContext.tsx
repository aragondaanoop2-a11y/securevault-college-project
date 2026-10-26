import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface AccountUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  active: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface ManagedAccount extends AccountUser {}

interface CreateAccountResult {
  user: ManagedAccount;
  temporaryPassword: string;
}

interface AuthContextValue {
  user: AccountUser | null;
  loading: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (password: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<string>;
  resetPassword: (token: string, password: string) => Promise<string>;
  listUsers: () => Promise<ManagedAccount[]>;
  createUser: (name: string, email: string) => Promise<CreateAccountResult>;
  setUserActive: (id: string, active: boolean) => Promise<ManagedAccount>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function authFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'The request could not be completed.');
  return payload as T;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let current = true;
    authFetch<{ user: AccountUser | null }>('/auth/session')
      .then(({ user: sessionUser }) => { if (current) setUser(sessionUser); })
      .catch(() => { if (current) setUser(null); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, []);

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    const payload = await authFetch<{ user: AccountUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, remember }),
    });
    setUser(payload.user);
  }, []);

  const logout = useCallback(async () => {
    try { await authFetch('/auth/logout', { method: 'POST', body: '{}' }); }
    finally { setUser(null); }
  }, []);

  const changePassword = useCallback(async (password: string) => {
    const payload = await authFetch<{ user: AccountUser }>('/auth/password/change', {
      method: 'POST', body: JSON.stringify({ password }),
    });
    setUser(payload.user);
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const payload = await authFetch<{ message: string }>('/auth/password/forgot', {
      method: 'POST', body: JSON.stringify({ email }),
    });
    return payload.message;
  }, []);

  const resetPassword = useCallback(async (token: string, password: string) => {
    const payload = await authFetch<{ message: string }>('/auth/password/reset', {
      method: 'POST', body: JSON.stringify({ token, password }),
    });
    return payload.message;
  }, []);

  const listUsers = useCallback(async () => {
    const payload = await authFetch<{ users: ManagedAccount[] }>('/auth/users');
    return payload.users;
  }, []);

  const createUser = useCallback(async (name: string, email: string) => authFetch<CreateAccountResult>('/auth/users', {
    method: 'POST', body: JSON.stringify({ name, email }),
  }), []);

  const setUserActive = useCallback(async (id: string, active: boolean) => {
    const payload = await authFetch<{ user: ManagedAccount }>(`/auth/users/${encodeURIComponent(id)}/active`, {
      method: 'PATCH', body: JSON.stringify({ active }),
    });
    return payload.user;
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout, changePassword, requestPasswordReset, resetPassword, listUsers, createUser, setUserActive }), [
    user, loading, login, logout, changePassword, requestPasswordReset, resetPassword, listUsers, createUser, setUserActive,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
};
