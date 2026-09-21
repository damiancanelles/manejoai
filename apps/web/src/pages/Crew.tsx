import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import LogoMark from '../components/LogoMark';
import LangToggle from '../components/LangToggle';

interface TimeEntry {
  id: string;
  clockIn: string;
  clockOut: string | null;
}
interface MeResponse {
  open: TimeEntry | null;
  recent: TimeEntry[];
}

function hoursOf(e: TimeEntry): string | null {
  if (!e.clockOut) return null;
  return ((new Date(e.clockOut).getTime() - new Date(e.clockIn).getTime()) / 3_600_000).toFixed(1);
}

function ClockTab() {
  const { t, locale } = useI18n();
  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api
      .get<MeResponse>('/time-entries/me')
      .then(setData)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function toggle() {
    setError(null);
    setBusy(true);
    try {
      await api.post(data?.open ? '/time-entries/clock-out' : '/time-entries/clock-in');
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        {loading ? (
          <p className="text-slate-400">{t('common.loading')}</p>
        ) : (
          <>
            <p className="mb-4 text-slate-700">
              {data?.open
                ? t('clock.clockedInSince', {
                    time: new Date(data.open.clockIn).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }),
                  })
                : t('clock.notClockedIn')}
            </p>
            <button
              onClick={toggle}
              disabled={busy}
              className={`w-full max-w-xs rounded-full py-4 text-lg font-bold text-white shadow-sm transition-colors disabled:opacity-60 ${
                data?.open ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {busy ? t('common.saving') : data?.open ? t('clock.clockOut') : t('clock.clockIn')}
            </button>
          </>
        )}
      </div>

      {error && <div className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}

      <h2 className="mb-2 mt-6 text-sm font-semibold text-slate-500">{t('clock.recent')}</h2>
      <div className="space-y-2">
        {(data?.recent ?? []).map((e) => (
          <div key={e.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm">
            <span className="text-slate-500">{new Date(e.clockIn).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}</span>
            <span className="flex-1 px-3 text-slate-700">
              {new Date(e.clockIn).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })}
              {' – '}
              {e.clockOut ? new Date(e.clockOut).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }) : t('clock.inProgress')}
            </span>
            <span className="font-semibold tabular-nums text-slate-900">{hoursOf(e) ? `${hoursOf(e)}h` : ''}</span>
          </div>
        ))}
        {!loading && (data?.recent ?? []).length === 0 && <p className="text-sm text-slate-400">{t('clock.noEntries')}</p>}
      </div>
    </div>
  );
}

const MAX_PHOTOS = 5;

function ReportTab() {
  const { t } = useI18n();
  const [rawText, setRawText] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onFilesPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const remaining = MAX_PHOTOS - photos.length;
    setPhotos((prev) => [...prev, ...files.slice(0, remaining)]);
    e.target.value = ''; // allow picking the same file again after removing it
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit() {
    setError(null);
    setSent(false);
    if (!rawText.trim() && photos.length === 0) {
      setError(t('reportJob.errEmpty'));
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      if (rawText.trim()) form.append('rawText', rawText.trim());
      photos.forEach((file) => form.append('photos', file, file.name));
      await api.post('/incoming-reports', form);
      setRawText('');
      setPhotos([]);
      setSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">{t('reportJob.title')}</h1>
      <p className="mb-4 mt-1 text-sm text-slate-500">{t('reportJob.subtitle')}</p>

      {error && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
      {sent && <div className="mb-3 rounded bg-green-50 p-2 text-sm text-green-700">{t('reportJob.sent')}</div>}

      <textarea
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        placeholder={t('reportJob.notePlaceholder')}
        rows={5}
        className="mb-4 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />

      <div className="mb-4 flex flex-wrap gap-3">
        {photos.map((file, i) => (
          <div key={i} className="relative h-20 w-20">
            <img src={URL.createObjectURL(file)} alt="" className="h-20 w-20 rounded-lg border border-slate-200 object-cover" />
            <button
              onClick={() => removePhoto(i)}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold leading-none text-white shadow"
              aria-label="Remove"
            >
              ×
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-center text-xs font-semibold text-indigo-600 shadow-sm"
          >
            {t('reportJob.addPhoto')}
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={onFilesPicked} className="hidden" />
      </div>

      <button
        onClick={onSubmit}
        disabled={submitting}
        className="w-full rounded-full bg-green-600 py-3.5 text-base font-bold text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-60"
      >
        {submitting ? t('common.saving') : t('reportJob.submit')}
      </button>
    </div>
  );
}

/**
 * A crew account's whole web app - job reports + clock in/out, nothing
 * else (every other API route 403s for this role, see CrewGuard). Mirrors
 * the mobile app's CrewTabs; built mobile-first (crew mostly opens this on
 * a phone browser) but works fine on desktop too. See ProtectedRoute for
 * how a crew login always lands here.
 */
export default function Crew() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const [tab, setTab] = useState<'clock' | 'report'>('clock');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoMark size={26} />
            <span className="font-semibold text-slate-900">{user ? t('clock.hi', { name: user.name }) : 'manejoai'}</span>
          </div>
          <button onClick={logout} className="text-sm text-slate-400 underline hover:text-indigo-600">
            {t('common.logOut')}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-4">
        <div className="mb-4 flex gap-2 rounded-full bg-slate-100 p-1">
          <button
            onClick={() => setTab('clock')}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition-colors ${
              tab === 'clock' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            {t('crew.tabClock')}
          </button>
          <button
            onClick={() => setTab('report')}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition-colors ${
              tab === 'report' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            {t('crew.tabReport')}
          </button>
        </div>

        {tab === 'clock' ? <ClockTab /> : <ReportTab />}

        <div className="mt-6 flex justify-center">
          <LangToggle />
        </div>
      </div>
    </div>
  );
}
