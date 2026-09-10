import { createContext, useContext, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getToken, setToken } from '../api/client';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'STAFF' | 'SUPERADMIN';
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
  // Mirrors Stripe's own status strings (trialing/active/past_due/canceled/...)
  // - see the Billing page and SubscriptionGuard on the backend.
  subscriptionStatus: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
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
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
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
  const navigate = useNavigate();

  function setBusiness(next: Business) {
    localStorage.setItem('manejoai_business', JSON.stringify(next));
    setBusinessState(next);
  }

  function storeSession(res: { accessToken: string; user: AuthUser; business: Business }) {
    setToken(res.accessToken);
    localStorage.setItem('manejoai_user', JSON.stringify(res.user));
    setUser(res.user);
    setBusiness(res.business);
    return res.user;
  }

  async function login(email: string, password: string) {
    const res = await api.post<{ accessToken: string; user: AuthUser; business: Business }>('/auth/login', {
      email,
      password,
    });
    return storeSession(res);
  }

  // Auto-logs in on success, same as login() - no separate sign-in step
  // after registering.
  async function register(input: RegisterInput) {
    const res = await api.post<{ accessToken: string; user: AuthUser; business: Business }>(
      '/auth/register',
      input,
    );
    return storeSession(res);
  }

  // Clears the session and sends the browser to /login - just clearing the
  // token left whoever clicked "Log out" sitting on the same protected page
  // (ProtectedRoute only re-checks on navigation, not on this state change).
  function logout() {
    setToken(null);
    localStorage.removeItem('manejoai_user');
    localStorage.removeItem('manejoai_business');
    setUser(null);
    setBusinessState(null);
    navigate('/login', { replace: true });
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

// Read directly from storage (not the React context) so route-level checks
// in App.tsx can use it outside a component, same as isLoggedIn().
export function isSuperAdmin() {
  return readStored<AuthUser>('manejoai_user')?.role === 'SUPERADMIN';
}
