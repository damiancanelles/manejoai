import { API_BASE } from '../api/client';

// Sends uncaught browser errors to the API (POST /api/client-errors), which
// alerts by email/webhook - see apps/api/src/monitoring. Best-effort: never
// throws, sends each distinct message at most once per page load, and
// never includes the query string (a reset link's token lives there).
const sent = new Set<string>();

export function reportClientError(message: string, stack?: string) {
  const msg = (message || 'Unknown error').slice(0, 500);
  if (sent.has(msg) || sent.size >= 10) return;
  sent.add(msg);
  try {
    void fetch(`${API_BASE}/api/client-errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'web',
        message: msg,
        stack: stack?.slice(0, 4000),
        where: window.location.pathname.slice(0, 200),
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* reporting must never cause another error */
  }
}

export function installErrorReporting() {
  window.addEventListener('error', (e) => {
    reportClientError(e.message, e.error instanceof Error ? e.error.stack : undefined);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    if (r instanceof Error) reportClientError(r.message, r.stack);
    else reportClientError(String(r));
  });
}
