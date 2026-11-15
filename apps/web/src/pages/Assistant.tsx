import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { streamAssistantMessage } from '../api/assistantStream';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n';
import { ActionCard, ChatText, type ChatMessage, type UIAction } from '../components/assistant/ChatParts';

interface PendingImage {
  mediaType: string;
  data: string; // base64, no data: prefix
  previewUrl: string;
  name: string;
}

const MAX_IMAGES = 4;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ACCEPTED_SPREADSHEET_EXT = /\.(xlsx|xls|csv)$/i;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * The full-page version of the assistant - same backend contract as the
 * corner widget (AssistantWidget), but room for pasting a real document and
 * attaching files: images go to Claude as actual vision input (see
 * assistant.service.ts), a spreadsheet gets parsed server-side into text
 * that's inserted into the compose box, same pattern as voice transcription.
 * History is in-memory only, same as the widget - a refresh starts fresh.
 */
export default function Assistant() {
  const { business } = useAuth();
  const t = useT();
  const isPro = business?.subscriptionTier === 'pro';
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [parsingFile, setParsingFile] = useState(false);
  const [images, setImages] = useState<PendingImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [liveReply, setLiveReply] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, sending, liveReply, status]);

  async function sendMessage(text: string, withImages: PendingImage[] = []) {
    setError(null);
    const next = [
      ...messages,
      {
        role: 'user' as const,
        content: text,
        images: withImages.length ? withImages.map(({ mediaType, data }) => ({ mediaType, data })) : undefined,
      },
    ];
    setMessages(next);
    setInput('');
    setImages([]);
    setSending(true);
    setLiveReply('');
    setStatus(t('assistant.thinking'));
    try {
      await streamAssistantMessage(
        { messages: next.map(({ role, content, images: imgs }) => ({ role, content, ...(imgs?.length ? { images: imgs } : {}) })) },
        (event) => {
          if (event.type === 'status') {
            setStatus(event.message);
          } else if (event.type === 'text') {
            setStatus(null);
            setLiveReply((prev) => prev + event.delta);
          } else if (event.type === 'done') {
            const actions: UIAction[] = (event.actions ?? []).map((a) => ({ ...a, status: 'pending' }));
            setMessages((prev) => [...prev, { role: 'assistant', content: event.reply, actions: actions.length ? actions : undefined }]);
          } else if (event.type === 'error') {
            setError(event.message || t('assistant.error'));
          }
        },
      );
    } catch (err: any) {
      setError(err.message || t('assistant.error'));
    } finally {
      setSending(false);
      setLiveReply('');
      setStatus(null);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if ((!text && images.length === 0) || sending) return;
    await sendMessage(text, images);
  }

  async function onPickImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    setError(null);
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      setError(t('assistant.tooManyImages', { max: MAX_IMAGES }));
      return;
    }
    const picked = files.slice(0, room);
    try {
      const read = await Promise.all(
        picked.map(async (file) => {
          if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
            throw new Error(t('assistant.unsupportedImage'));
          }
          const dataUrl = await readFileAsDataUrl(file);
          const data = dataUrl.slice(dataUrl.indexOf(',') + 1);
          return { mediaType: file.type, data, previewUrl: dataUrl, name: file.name };
        }),
      );
      setImages((prev) => [...prev, ...read]);
    } catch (err: any) {
      setError(err.message || t('assistant.error'));
    }
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function onPickSpreadsheet(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ACCEPTED_SPREADSHEET_EXT.test(file.name)) {
      setError(t('assistant.unsupportedSpreadsheet'));
      return;
    }
    setParsingFile(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post<{ text: string }>('/assistant/parse-spreadsheet', form);
      setInput((prev) => (prev ? `${prev}\n\n${res.text}` : res.text));
    } catch (err: any) {
      setError(err.message || t('assistant.error'));
    } finally {
      setParsingFile(false);
    }
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
      if (text) setInput((prev) => (prev ? `${prev} ${text}` : text));
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

  if (!isPro) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center text-sm">
        <p className="text-slate-600">{t('assistant.upsell', { pro: t('assistant.proWord') })}</p>
        <Link
          to="/billing"
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          {t('assistant.upgradeCta')}
        </Link>
      </div>
    );
  }

  const busy = sending || recording || transcribing || parsingFile;

  return (
    <div className="flex h-[calc(100vh-7rem)] max-w-4xl flex-col md:h-[calc(100vh-4rem)]">
      <h1 className="mb-3 text-2xl font-bold">{t('assistant.pageTitle')}</h1>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm">
        {messages.length === 0 && <p className="text-slate-400">{t('assistant.placeholderExamples')}</p>}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] space-y-2 ${m.role === 'user' ? '' : 'w-full'}`}>
              {m.images && m.images.length > 0 && (
                <div className="flex flex-wrap justify-end gap-1.5">
                  {m.images.map((img, j) => (
                    <img
                      key={j}
                      src={`data:${img.mediaType};base64,${img.data}`}
                      alt=""
                      className="h-20 w-20 rounded object-cover"
                    />
                  ))}
                </div>
              )}
              {m.content && (
                <div
                  className={`whitespace-pre-wrap rounded-lg px-3 py-2 ${
                    m.role === 'user' ? 'ml-auto w-fit bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  <ChatText text={m.content} />
                </div>
              )}
              {m.actions && m.actions.length > 0 && (
                <div className="space-y-2">
                  {m.actions.map((a) => (
                    <ActionCard key={a.id} action={a} onApprove={() => approveAction(a)} onReject={() => rejectAction(a)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {sending &&
          (liveReply ? (
            <div className="whitespace-pre-wrap rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-800">
              <ChatText text={liveReply} />
            </div>
          ) : (
            <div className="text-slate-400">{status || t('assistant.thinking')}</div>
          ))}
        {error && <div className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
      </div>

      <form onSubmit={onSubmit} className="mt-3 space-y-2">
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((img, i) => (
              <div key={i} className="relative">
                <img src={img.previewUrl} alt={img.name} className="h-16 w-16 rounded border border-slate-200 object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  aria-label={t('common.remove')}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-xs text-white hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={parsingFile ? t('assistant.parsingFile') : transcribing ? t('assistant.transcribing') : t('assistant.inputPlaceholderBig')}
          disabled={busy}
          rows={5}
          className="w-full resize-y rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />

        <div className="flex flex-wrap items-center gap-2">
          <input ref={imageInputRef} type="file" accept="image/*" multiple hidden onChange={onPickImages} />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={busy || images.length >= MAX_IMAGES}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            {t('assistant.attachImage')}
          </button>

          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={onPickSpreadsheet} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            {t('assistant.attachSpreadsheet')}
          </button>

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
            disabled={busy || (!input.trim() && images.length === 0)}
            className="ml-auto rounded bg-indigo-600 px-4 py-1.5 text-sm text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {t('assistant.send')}
          </button>
        </div>
      </form>
    </div>
  );
}
