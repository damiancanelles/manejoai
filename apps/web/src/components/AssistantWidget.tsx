import { FormEvent, Fragment, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { downloadStatementPdf } from '../lib/statementPdf';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n';

type ActionStatus = 'pending' | 'approving' | 'approved' | 'rejected' | 'error';

interface UIAction {
  id: string;
  type: string;
  summary: string;
  params: Record<string, unknown>;
  status: ActionStatus;
  link?: string;
  error?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  actions?: UIAction[];
}

// Matches a plain markdown link whose target is an in-app path, e.g.
// "[Unit 413 Punch Out](/invoices/abc123)" - anything else (plain text,
// links without that shape) passes through untouched.
const LINK_RE = /\[([^\]]+)\]\((\/[^\s)]+)\)/g;

// get_statement hands the assistant a /statements/account/<id> or
// /statements/property/<id> "link" (see assistant.service.ts) - it never
// opens a page, it's the chat's own signal to download a PDF right there.
const STATEMENT_RE = /^\/statements\/(account|property)\/([^/?]+)(?:\?(.*))?$/;

/** A statement link downloads a PDF on click instead of navigating - same visual style as a normal chat link. */
function StatementLink({ href, label }: { href: string; label: string }) {
  const { business } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    const match = href.match(STATEMENT_RE);
    if (!match || !business) return;
    const [, scope, id, qs] = match;
    const params = new URLSearchParams(qs ?? '');
    setDownloading(true);
    setError(null);
    try {
      await downloadStatementPdf(
        scope as 'account' | 'property',
        id,
        business,
        params.get('dateFrom') ?? undefined,
        params.get('dateTo') ?? undefined,
      );
    } catch (err: any) {
      setError(err.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={downloading}
        className="font-medium text-indigo-600 underline hover:text-indigo-700 disabled:opacity-50"
      >
        {downloading ? '…' : label}
      </button>
      {error && <span className="ml-1 text-xs text-red-600">({error})</span>}
    </>
  );
}

/** Renders assistant text, turning `[label](/path)` into a real in-SPA navigation link - or, for a /statements/... path, a PDF-download button instead. */
function ChatText({ text }: { text: string }) {
  const parts: (string | { label: string; href: string })[] = [];
  let lastIndex = 0;
  for (const m of text.matchAll(LINK_RE)) {
    if (m.index! > lastIndex) parts.push(text.slice(lastIndex, m.index));
    parts.push({ label: m[1], href: m[2] });
    lastIndex = m.index! + m[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));

  return (
    <>
      {parts.map((part, i) =>
        typeof part === 'string' ? (
          <Fragment key={i}>{part}</Fragment>
        ) : STATEMENT_RE.test(part.href) ? (
          <StatementLink key={i} href={part.href} label={part.label} />
        ) : (
          <Link key={i} to={part.href} className="font-medium text-indigo-600 underline hover:text-indigo-700">
            {part.label}
          </Link>
        ),
      )}
    </>
  );
}

function ActionCard({ action, onApprove, onReject }: { action: UIAction; onApprove: () => void; onReject: () => void }) {
  const t = useT();
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-sm">
      <p className="text-slate-800">{action.summary}</p>
      {action.status === 'pending' && (
        <div className="mt-2 flex gap-2">
          <button
            onClick={onApprove}
            className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            {t('assistant.approve')}
          </button>
          <button
            onClick={onReject}
            className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            {t('assistant.reject')}
          </button>
        </div>
      )}
      {action.status === 'approving' && <p className="mt-1.5 text-xs text-slate-500">{t('assistant.approving')}</p>}
      {action.status === 'approved' && (
        <div className="mt-1.5 flex items-center gap-2 text-xs">
          <span className="font-medium text-green-700">✓ {t('assistant.approved')}</span>
          {action.link && (
            <Link to={action.link} className="font-medium text-indigo-600 underline hover:text-indigo-700">
              {t('assistant.viewResult')}
            </Link>
          )}
        </div>
      )}
      {action.status === 'rejected' && <p className="mt-1.5 text-xs text-slate-400">{t('assistant.rejected')}</p>}
      {action.status === 'error' && (
        <div className="mt-1.5 space-y-1.5">
          <p className="text-xs text-red-700">{action.error || t('assistant.actionFailed')}</p>
          <button
            onClick={onApprove}
            className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            {t('assistant.retry')}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * The bottom-right chat bubble - the Pro assistant, which can both look
 * things up and plan/propose changes (POST /assistant/message runs the
 * actual Claude tool-use loop on the backend). Every proposed change comes
 * back as an action card here; nothing happens until the user clicks
 * Approve, which calls POST /assistant/actions/execute - the only path a
 * chat-originated change can reach the real, guarded REST services through.
 * History lives only in this component's state - not persisted, a refresh
 * starts fresh (and so do any pending action cards - only what's on screen
 * can still be approved).
 */
export default function AssistantWidget() {
  const { business } = useAuth();
  const t = useT();
  const isPro = business?.subscriptionTier === 'pro';
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open, sending]);

  async function sendMessage(text: string) {
    setError(null);
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    setSending(true);
    try {
      const res = await api.post<{
        reply: string;
        actions: { id: string; type: string; summary: string; params: Record<string, unknown> }[];
      }>('/assistant/message', { messages: next.map(({ role, content }) => ({ role, content })) });
      const actions: UIAction[] = (res.actions ?? []).map((a) => ({ ...a, status: 'pending' }));
      setMessages([...next, { role: 'assistant', content: res.reply, actions: actions.length ? actions : undefined }]);
    } catch (err: any) {
      setError(err.message || t('assistant.error'));
    } finally {
      setSending(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    await sendMessage(text);
  }

  async function startRecording() {
    if (recording || sending || transcribing) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        void handleRecordingStop(recorder.mimeType);
      };
      mediaRecorderRef.current = recorder;
      setError(null);
      recorder.start();
      setRecording(true);
    } catch {
      setError(t('assistant.micError'));
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function handleRecordingStop(mimeType: string) {
    const blob = new Blob(chunksRef.current, { type: mimeType });
    chunksRef.current = [];
    if (blob.size === 0) return;

    setTranscribing(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('audio', blob, mimeType.includes('mp4') ? 'voice.m4a' : 'voice.webm');
      const res = await api.post<{ text: string }>('/assistant/transcribe', form);
      const text = res.text.trim();
      if (text) await sendMessage(text);
      else setError(t('assistant.transcribeEmpty'));
    } catch (err: any) {
      setError(err.message || t('assistant.transcribeError'));
    } finally {
      setTranscribing(false);
    }
  }

  function patchAction(actionId: string, patch: Partial<UIAction>) {
    setMessages((prev) =>
      prev.map((m) =>
        m.actions?.some((a) => a.id === actionId)
          ? { ...m, actions: m.actions.map((a) => (a.id === actionId ? { ...a, ...patch } : a)) }
          : m,
      ),
    );
  }

  async function approveAction(action: UIAction) {
    patchAction(action.id, { status: 'approving', error: undefined });
    try {
      const res = await api.post<{ ok: boolean; link?: string }>('/assistant/actions/execute', {
        type: action.type,
        params: action.params,
      });
      patchAction(action.id, { status: 'approved', link: res.link });
    } catch (err: any) {
      patchAction(action.id, { status: 'error', error: err.message || t('assistant.actionFailed') });
    }
  }

  function rejectAction(action: UIAction) {
    patchAction(action.id, { status: 'rejected' });
  }

  return (
    // z-index maxed out and nudged in from the corner so third-party
    // overlays that inject themselves bottom-right (e.g. Netlify's
    // owner-only drawer on *.netlify.app) can't sit on top of the bubble.
    <div className="fixed bottom-5 right-5 z-[2147483647] flex flex-col items-end">
      {open && (
        <div className="mb-3 flex h-[34rem] w-[24rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 bg-indigo-600 px-4 py-3 text-white">
            <span className="text-sm font-semibold">{t('assistant.header')}</span>
            <button onClick={() => setOpen(false)} aria-label={t('assistant.close')} className="text-indigo-100 hover:text-white">
              ✕
            </button>
          </div>

          {isPro ? (
            <>
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3 text-sm">
                {messages.length === 0 && (
                  <p className="text-slate-400">{t('assistant.placeholderExamples')}</p>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] space-y-2 ${m.role === 'user' ? '' : 'w-full'}`}>
                      <div
                        className={`whitespace-pre-wrap rounded-lg px-3 py-2 ${
                          m.role === 'user' ? 'ml-auto w-fit bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        <ChatText text={m.content} />
                      </div>
                      {m.actions && m.actions.length > 0 && (
                        <div className="space-y-2">
                          {m.actions.map((a) => (
                            <ActionCard
                              key={a.id}
                              action={a}
                              onApprove={() => approveAction(a)}
                              onReject={() => rejectAction(a)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {sending && <div className="text-slate-400">{t('assistant.thinking')}</div>}
                {error && <div className="rounded bg-red-50 p-2 text-red-700">{error}</div>}
              </div>

              <form onSubmit={onSubmit} className="flex gap-2 border-t border-slate-200 p-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={transcribing ? t('assistant.transcribing') : t('assistant.inputPlaceholder')}
                  disabled={sending || recording || transcribing}
                  className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={recording ? stopRecording : startRecording}
                  disabled={sending || transcribing}
                  aria-label={recording ? t('assistant.stopRecording') : t('assistant.startRecording')}
                  className={`flex items-center justify-center rounded px-2.5 py-1.5 text-sm shadow-sm transition-colors disabled:opacity-50 ${
                    recording ? 'animate-pulse bg-red-600 text-white hover:bg-red-700' : 'border border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M9 22h6" />
                  </svg>
                </button>
                <button
                  type="submit"
                  disabled={sending || recording || transcribing || !input.trim()}
                  className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
                >
                  {t('assistant.send')}
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm">
              <p className="text-slate-600">{t('assistant.upsell', { pro: t('assistant.proWord') })}</p>
              <Link
                to="/billing"
                className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
              >
                {t('assistant.upgradeCta')}
              </Link>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? t('assistant.closeAria') : t('assistant.openAria')}
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
