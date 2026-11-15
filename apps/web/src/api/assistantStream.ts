import { API_BASE, getToken, setToken } from './client';

export type AssistantStreamEvent =
  | { type: 'text'; delta: string }
  | { type: 'status'; message: string }
  | { type: 'done'; reply: string; actions: { id: string; type: string; summary: string; params: Record<string, unknown> }[] }
  | { type: 'error'; message: string };

/**
 * POST /assistant/message/stream, consumed as newline-delimited JSON - the
 * web chat's only transport (AssistantWidget + the dedicated /assistant
 * page; the mobile app still calls the plain JSON /assistant/message). Each
 * parsed line is handed to onEvent as it arrives; this resolves once the
 * stream ends. Mirrors client.ts's 401/402 handling since this bypasses its
 * request() helper (that helper assumes one JSON body at the end, not an
 * open stream).
 */
export async function streamAssistantMessage(body: unknown, onEvent: (event: AssistantStreamEvent) => void): Promise<void> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/assistant/message/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    setToken(null);
    window.location.href = '/login';
    throw new Error('Session expired');
  }
  if (res.status === 402 && window.location.pathname !== '/billing') {
    window.location.href = '/billing';
    throw new Error('Subscription required');
  }
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.message || `Request failed (${res.status})`);
  }
  if (!res.body) {
    throw new Error('Streaming is not supported in this browser');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const consumeLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      onEvent(JSON.parse(trimmed) as AssistantStreamEvent);
    } catch {
      // A line split across two reads before the final flush, or a stray
      // byte - skip rather than crash the whole stream over one bad line.
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      consumeLine(buffer.slice(0, newlineIndex));
      buffer = buffer.slice(newlineIndex + 1);
    }
  }
  consumeLine(buffer);
}
