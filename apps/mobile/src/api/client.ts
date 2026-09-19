import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'manejoai_token';

// Unlike the web app, a native client has no same-origin/relative-path
// trick (no dev proxy, no netlify.toml redirect) - every request needs a
// real absolute URL. Defaults to STAGING, never production, so a build
// that forgets to set EXPO_PUBLIC_API_BASE_URL can't accidentally touch
// real customer data. Set this per build profile in eas.json when a
// production build is actually wanted.
const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://manejoai-api-staging-65cc6d441cef.herokuapp.com';

// SecureStore (iOS Keychain / Android Keystore) instead of localStorage -
// encrypted at rest, and it's the platform-recommended place for an auth
// token. Unlike localStorage this is async-only, which is why getToken/
// setToken (and everything that calls them) are promises here.
export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string | null): Promise<void> {
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// The web client redirects with window.location on 401/402 - there's no
// such thing here, so the API client instead calls back into whatever
// AuthContext registered, and AuthContext/navigation react to state
// changing (same "auth state drives what's on screen" pattern the web
// app's ProtectedRoute uses, just without a browser URL to push).
type Handler = () => void;
let unauthorizedHandler: Handler | null = null;
let subscriptionRequiredHandler: Handler | null = null;

export function setUnauthorizedHandler(fn: Handler | null) {
  unauthorizedHandler = fn;
}

export function setSubscriptionRequiredHandler(fn: Handler | null) {
  subscriptionRequiredHandler = fn;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = { ...(options.headers as any) };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api${path}`, { ...options, headers });

  if (res.status === 401) {
    await setToken(null);
    unauthorizedHandler?.();
    throw new Error('Session expired');
  }

  // Subscription lapsed (trial ended unpaid, or a renewal failed) - still
  // logged in, just not allowed to use paid features. The web app redirects
  // to /billing; here we just flag it and let the app shell decide what to
  // show (the Billing screen lands in WO-2 - this hook exists now so
  // nothing needs to change in every screen once it does).
  if (res.status === 402) {
    subscriptionRequiredHandler?.();
    throw new Error('Subscription required');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed (${res.status})`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T,>(path: string) => request<T>(path),
  post: <T,>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  patch: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T,>(path: string) => request<T>(path, { method: 'DELETE' }),
};
