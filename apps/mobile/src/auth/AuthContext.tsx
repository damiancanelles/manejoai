import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setToken, setUnauthorizedHandler, setSubscriptionRequiredHandler } from '../api/client';

// Same shapes as apps/web/src/context/AuthContext.tsx - both clients talk
// to the same /auth/login response.
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
  emailSlug: string;
  replyToEmail: string | null;
  subscriptionStatus: string;
  subscriptionTier: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  business: Business | null;
  // True until the SecureStore/AsyncStorage bootstrap read finishes - the
  // web app can read localStorage synchronously on first render so it
  // never needs this, but a native app has to wait a tick before it knows
  // whether anyone's logged in.
  loading: boolean;
  // Set by the API client on a 402 - "logged in, but the subscription
  // lapsed." No Billing screen consumes this yet (that's WO-2); the flag
  // exists now so nothing has to change once it does.
  subscriptionBlocked: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  setBusiness: (business: Business) => void;
}

const USER_KEY = 'manejoai_user';
const BUSINESS_KEY = 'manejoai_business';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function readStored<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [business, setBusinessState] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionBlocked, setSubscriptionBlocked] = useState(false);

  useEffect(() => {
    Promise.all([readStored<AuthUser>(USER_KEY), readStored<Business>(BUSINESS_KEY)])
      .then(([storedUser, storedBusiness]) => {
        setUser(storedUser);
        setBusinessState(storedBusiness);
      })
      .finally(() => setLoading(false));

    // Reacts to the API client's 401/402 the same way the web app's
    // window.location redirects do - just via state instead of a URL.
    setUnauthorizedHandler(() => {
      setUser(null);
      setBusinessState(null);
      AsyncStorage.multiRemove([USER_KEY, BUSINESS_KEY]).catch(() => {});
    });
    setSubscriptionRequiredHandler(() => setSubscriptionBlocked(true));

    return () => {
      setUnauthorizedHandler(null);
      setSubscriptionRequiredHandler(null);
    };
  }, []);

  function setBusiness(next: Business) {
    AsyncStorage.setItem(BUSINESS_KEY, JSON.stringify(next)).catch(() => {});
    setBusinessState(next);
    setSubscriptionBlocked(false);
  }

  async function login(email: string, password: string) {
    const res = await api.post<{ accessToken: string; user: AuthUser; business: Business }>('/auth/login', {
      email,
      password,
    });
    await setToken(res.accessToken);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setUser(res.user);
    setBusiness(res.business);
    return res.user;
  }

  async function logout() {
    await setToken(null);
    await AsyncStorage.multiRemove([USER_KEY, BUSINESS_KEY]);
    setUser(null);
    setBusinessState(null);
    setSubscriptionBlocked(false);
  }

  return (
    <AuthContext.Provider
      value={{ user, business, loading, subscriptionBlocked, login, logout, setBusiness }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
