const TOKEN_KEY = 'manejoai_token';

// Empty by default - the frontend calls relative "/api/..." paths, which
// Vite's dev proxy (local) or netlify.toml's redirect (production) forwards
// to the real API, same origin as far as the browser's concerned. Setting
// this at build time (e.g. VITE_API_BASE_URL=https://manejoai-api-staging...)
// makes the frontend call a different API directly instead - used for the
// staging site, which has its own separate backend to hit.
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { ...(options.headers as any) };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api${path}`, { ...options, headers });

  if (res.status === 401) {
    setToken(null);
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  // Subscription lapsed (trial ended unpaid, or a renewal failed) - still
  // logged in, just not allowed to use paid features, so redirect instead
  // of clearing the session. /billing itself never returns this (see
  // SubscriptionGuard - it's never applied to the checkout/portal/business
  // routes that page calls), so this can't loop.
  if (res.status === 402 && window.location.pathname !== '/billing') {
    window.location.href = '/billing';
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
