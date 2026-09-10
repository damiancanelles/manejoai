import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * The bottom-right chat bubble - a read-only assistant that can look things
 * up in this business's own data (POST /assistant/message on the backend,
 * which does the actual Claude tool-use loop). History lives only in this
 * component's state - not persisted, a refresh starts fresh.
 */
export default function AssistantWidget() {
  const { business } = useAuth();
  const isPro = business?.subscriptionTier === 'pro';
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open, sending]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setError(null);
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    setSending(true);
    try {
      const res = await api.post<{ reply: string }>('/assistant/message', { messages: next });
      setMessages([...next, { role: 'assistant', content: res.reply }]);
    } catch (err: any) {
      setError(err.message || 'Something went wrong - try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    // z-index maxed out and nudged in from the corner so third-party
    // overlays that inject themselves bottom-right (e.g. Netlify's
    // owner-only drawer on *.netlify.app) can't sit on top of the bubble.
    <div className="fixed bottom-5 right-5 z-[2147483647] flex flex-col items-end">
      {open && (
        <div className="mb-3 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 bg-indigo-600 px-4 py-3 text-white">
            <span className="text-sm font-semibold">Ask about your business</span>
            <button onClick={() => setOpen(false)} aria-label="Close" className="text-indigo-100 hover:text-white">
              ✕
            </button>
          </div>

          {isPro ? (
            <>
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3 text-sm">
                {messages.length === 0 && (
                  <p className="text-slate-400">
                    Ask things like "find invoices for unit 213" or "what jobs are still in progress?"
                  </p>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 ${
                        m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {sending && <div className="text-slate-400">Thinking...</div>}
                {error && <div className="rounded bg-red-50 p-2 text-red-700">{error}</div>}
              </div>

              <form onSubmit={onSubmit} className="flex gap-2 border-t border-slate-200 p-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question..."
                  disabled={sending}
                  className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm">
              <p className="text-slate-600">
                The assistant looks things up in your business for you - invoices, jobs, customers - in plain
                English. It's part of the <span className="font-semibold text-slate-800">Pro</span> plan.
              </p>
              <Link
                to="/billing"
                className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
              >
                Upgrade to Pro - $25/month
              </Link>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close assistant' : 'Open assistant'}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-colors hover:bg-indigo-700"
      >
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.4 8.4 0 0 1-3.5-.75L3 21l1.75-5.5A8.4 8.4 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5Z"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
