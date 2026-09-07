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
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStored<T>(key: string): T | null {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStored('manejoai_user'));
  const [business, setBusiness] = useState<Business | null>(() => readStored('manejoai_business'));
  const [loading] = useState(false);

  function storeSession(res: { accessToken: string; user: AuthUser; business: Business }) {
    setToken(res.accessToken);
    localStorage.setItem('manejoai_user', JSON.stringify(res.user));
    localStorage.setItem('manejoai_business', JSON.stringify(res.business));
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
    setBusiness(null);
  }

  return (
    <AuthContext.Provider value={{ user, business, loading, login, register, logout }}>
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
