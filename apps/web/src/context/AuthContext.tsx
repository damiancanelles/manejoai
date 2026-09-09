import { createContext, useContext, useState, ReactNode } from 'react';
import { api, getToken, setToken } from '../api/client';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'STAFF';
}

export interface Business {
  id: string;
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  phone: string | null;
  // The local part of this business's sending address, <emailSlug>@manejoai.cloud
  // - not editable (see Settings), shown there for reference.
  emailSlug: string;
  replyToEmail: string | null;
}

interface RegisterInput {
  businessName: string;
  addressLine1: string;
  addressLine2?: string;
  phone?: string;
  name: string;
  email: string;
  password: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  business: Business | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  // Syncs a freshly-saved Business (e.g. from the Settings page's own PATCH
  // call) into context + localStorage, so invoice PDFs/emails pick up the
  // new name/address immediately without needing a re-login.
  setBusiness: (business: Business) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStored<T>(key: string): T | null {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStored('manejoai_user'));
  const [business, setBusinessState] = useState<Business | null>(() => readStored('manejoai_business'));
  const [loading] = useState(false);

  function setBusiness(next: Business) {
    localStorage.setItem('manejoai_business', JSON.stringify(next));
    setBusinessState(next);
  }

  function storeSession(res: { accessToken: string; user: AuthUser; business: Business }) {
    setToken(res.accessToken);
    localStorage.setItem('manejoai_user', JSON.stringify(res.user));
    setUser(res.user);
    setBusiness(res.business);
  }

  async function login(email: string, password: string) {
    const res = await api.post<{ accessToken: string; user: AuthUser; business: Business }>('/auth/login', {
      email,
      password,
    });
    storeSession(res);
  }

  // Auto-logs in on success, same as login() - no separate sign-in step
  // after registering.
  async function register(input: RegisterInput) {
    const res = await api.post<{ accessToken: string; user: AuthUser; business: Business }>(
      '/auth/register',
      input,
    );
    storeSession(res);
  }

  function logout() {
    setToken(null);
    localStorage.removeItem('manejoai_user');
    localStorage.removeItem('manejoai_business');
    setUser(null);
    setBusinessState(null);
  }

  return (
    <AuthContext.Provider value={{ user, business, loading, login, register, logout, setBusiness }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function isLoggedIn() {
  return !!getToken();
}
