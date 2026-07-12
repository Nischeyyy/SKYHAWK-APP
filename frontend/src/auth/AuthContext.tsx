import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken, getToken, setUnauthorizedHandler } from '../api/client';

type User = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  employee_number?: string;
  licence_number?: string;
  licence_expiry?: string;
  photo_url?: string;
  onboarding_complete?: boolean;
  employment_status?: string;
  certifications?: string[];
  emergency_contact?: any;
  phone?: string;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  /** True when the server rejected a previously-valid token (e.g. secret rotated). */
  sessionExpired: boolean;
  clearSessionExpired: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, full_name: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        setUser(null);
        return;
      }
      const u = await api<User>('/auth/me');
      setUser(u);
    } catch {
      await setToken(null);
      setUser(null);
    }
  }, []);

  // Register the global 401 handler so any screen's api() call can clear the session.
  useEffect(() => {
    setUnauthorizedHandler(async () => {
      await setToken(null);
      setUser(null);
      setSessionExpired(true);
    });
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const r = await api<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });
    await setToken(r.access_token);
    setUser(r.user);
    setSessionExpired(false);
  };

  const register = async (
    email: string,
    password: string,
    full_name: string,
    phone?: string
  ) => {
    const r = await api<{ access_token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: { email, password, full_name, phone },
      auth: false,
    });
    await setToken(r.access_token);
    setUser(r.user);
    setSessionExpired(false);
  };

  const logout = async () => {
    await setToken(null);
    setUser(null);
  };

  const clearSessionExpired = useCallback(() => setSessionExpired(false), []);

  return (
    <Ctx.Provider
      value={{ user, loading, sessionExpired, clearSessionExpired, login, register, logout, refresh }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used within AuthProvider');
  return c;
}
