import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useI18n } from '../i18n';
import { groupByDay, groupByWeek, type StatsTimeEntry } from '../lib/timeStats';

interface CrewMember {
  id: string;
  name: string;
  email: string;
  active: boolean;
  createdAt: string;
}
interface TimeEntryRow extends StatsTimeEntry {
  id: string;
}
interface IncomingReportRow {
  id: string;
  rawText: string | null;
  photoUrls: string[];
  status: 'PENDING' | 'CONVERTED' | 'DISMISSED';
  receivedAt: string;
}

// <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in LOCAL time (no
// timezone) - new Date(thatString) then correctly parses it as local time,
// so .toISOString() on the way out round-trips correctly either direction.
function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function TeamMemberDetail() {
  const { t, locale } = useI18n();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [member, setMember] = useState<CrewMember | null>(null);
  const [entries, setEntries] = useState<TimeEntryRow[]>([]);
  const [reports, setReports] = useState<IncomingReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'day' | 'week'>('week');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  function load() {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.get<CrewMember>(`/users/${id}`),
      api.get<TimeEntryRow[]>(`/time-entries?userId=${id}`),
      api.get<IncomingReportRow[]>(`/incoming-reports?submittedByUserId=${id}`),
    ])
      .then(([m, e, r]) => {
        setMember(m);
        setEntries(e);
        setReports(r);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  async function deactivate() {
    if (!id || !confirm(t('team.deactivateConfirm'))) return;
    await api.delete(`/users/${id}`);
    navigate('/team');
  }

  const openEntry = entries.find((e) => !e.clockOut) ?? null;

  async function clockInNow() {
    if (!id) return;
    setError(null);
    setBusy(true);
    try {
      await api.post(`/time-entries/${id}/clock-in`);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function clockOutNow() {
    if (!id) return;
    setError(null);
    setBusy(true);
    try {
      await api.post(`/time-entries/${id}/clock-out`);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitAddEntry(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id) return;
    setError(null);
    const form = new FormData(e.currentTarget);
    const clockInLocal = form.get('clockIn') as string;
    const clockOutLocal = form.get('clockOut') as string;
    if (clockOutLocal && new Date(clockOutLocal) <= new Date(clockInLocal)) {
      setError(t('team.errClockOutBeforeIn'));
      return;
    }
    try {
      await api.post('/time-entries', {
        userId: id,
        clockIn: new Date(clockInLocal).toISOString(),
        clockOut: clockOutLocal ? new Date(clockOutLocal).toISOString() : undefined,
      });
      setShowAddEntry(false);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function submitEditEntry(e: FormEvent<HTMLFormElement>, entryId: string) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const clockInLocal = form.get('clockIn') as string;
    const clockOutLocal = form.get('clockOut') as string;
    if (clockOutLocal && new Date(clockOutLocal) <= new Date(clockInLocal)) {
      setError(t('team.errClockOutBeforeIn'));
      return;
    }
    try {
      await api.patch(`/time-entries/${entryId}`, {
        clockIn: new Date(clockInLocal).toISOString(),
        clockOut: clockOutLocal ? new Date(clockOutLocal).toISOString() : undefined,
      });
      setEditingEntryId(null);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function deleteEntry(entryId: string) {
    if (!confirm(t('team.deleteEntryConfirm'))) return;
    setError(null);
    try {
      await api.delete(`/time-entries/${entryId}`);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (loading || !member) return <p>{t('common.loading')}</p>;

  const buckets = view === 'day' ? groupByDay(entries, locale) : groupByWeek(entries, locale);
  const totalHours = entries.reduce((sum, e) => {
    if (!e.clockOut) return sum;
    return sum + (new Date(e.clockOut).getTime() - new Date(e.clockIn).getTime()) / 3_600_000;
  }, 0);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{member.name}</h1>
          <p className="text-sm text-slate-500">{member.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {!member.active ? (
            <span className="rounded bg-slate-100 px-2 py-1 text-sm font-medium text-slate-500">{t('team.deactivated')}</span>
          ) : (
            <button onClick={deactivate} className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
              {t('team.deactivate')}
            </button>
          )}
        </div>
      </div>

      {error && <div className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('team.hours')}</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setView('week')}
              className={`rounded px-3 py-1 text-sm transition-colors ${view === 'week' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {t('team.byWeek')}
            </button>
            <button
              onClick={() => setView('day')}
              className={`rounded px-3 py-1 text-sm transition-colors ${view === 'day' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {t('team.byDay')}
            </button>
          </div>
        </div>
        <p className="mb-2 text-sm text-slate-500">{t('team.totalHours', { hours: totalHours.toFixed(1) })}</p>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-slate-500">
              <tr>
                <th className="px-3 py-2">{view === 'week' ? t('team.colWeek') : t('team.colDay')}</th>
                <th className="px-3 py-2 text-right">{t('team.colHours')}</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b) => (
                <tr key={b.key} className="border-t border-slate-100">
                  <td className="px-3 py-2">{b.label}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{b.hours.toFixed(1)}</td>
                </tr>
              ))}
              {buckets.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-3 py-4 text-slate-400">
                    {t('team.noHours')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t('team.timeEntries')}</h2>
          <div className="flex gap-2">
            {member.active &&
              (openEntry ? (
                <button
                  onClick={clockOutNow}
                  disabled={busy}
                  className="rounded bg-red-600 px-3 py-1.5 text-sm text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {t('clock.clockOut')}
                </button>
              ) : (
                <button
                  onClick={clockInNow}
                  disabled={busy}
                  className="rounded bg-green-600 px-3 py-1.5 text-sm text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-50"
                >
                  {t('clock.clockIn')}
                </button>
              ))}
            <button
              onClick={() => setShowAddEntry((v) => !v)}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              {showAddEntry ? t('common.cancel') : t('team.addEntry')}
            </button>
          </div>
        </div>

        {showAddEntry && (
          <form onSubmit={submitAddEntry} className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <label className="text-sm">
              {t('team.entryClockIn')}
              <input type="datetime-local" name="clockIn" required className="mt-1 block rounded border border-slate-300 px-2 py-1.5" />
            </label>
            <label className="text-sm">
              {t('team.entryClockOut')}
              <input type="datetime-local" name="clockOut" className="mt-1 block rounded border border-slate-300 px-2 py-1.5" />
            </label>
            <button type="submit" className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white shadow-sm transition-colors hover:bg-indigo-700">
              {t('common.add')}
            </button>
          </form>
        )}

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-slate-500">
              <tr>
                <th className="px-3 py-2">{t('team.entryClockIn')}</th>
                <th className="px-3 py-2">{t('clock.clockOut')}</th>
                <th className="px-3 py-2 text-right">{t('team.colHours')}</th>
                <th className="w-24 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) =>
                editingEntryId === entry.id ? (
                  <tr key={entry.id} className="border-t border-slate-100">
                    <td colSpan={4} className="px-3 py-2">
                      <form onSubmit={(e) => submitEditEntry(e, entry.id)} className="flex flex-wrap items-center gap-2">
                        <input
                          type="datetime-local"
                          name="clockIn"
                          required
                          defaultValue={toDatetimeLocalValue(entry.clockIn)}
                          className="rounded border border-slate-300 px-2 py-1"
                        />
                        <input
                          type="datetime-local"
                          name="clockOut"
                          defaultValue={entry.clockOut ? toDatetimeLocalValue(entry.clockOut) : ''}
                          className="rounded border border-slate-300 px-2 py-1"
                        />
                        <button type="submit" className="rounded bg-indigo-600 px-3 py-1 text-white shadow-sm transition-colors hover:bg-indigo-700">
                          {t('common.save')}
                        </button>
                        <button type="button" onClick={() => setEditingEntryId(null)} className="rounded border border-slate-300 px-3 py-1">
                          {t('common.cancel')}
                        </button>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={entry.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{new Date(entry.clockIn).toLocaleString(locale)}</td>
                    <td className="px-3 py-2">{entry.clockOut ? new Date(entry.clockOut).toLocaleString(locale) : t('clock.inProgress')}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {entry.clockOut ? ((new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / 3_600_000).toFixed(1) : ''}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => setEditingEntryId(entry.id)} className="mr-2 text-slate-500 hover:text-slate-900">
                        {t('common.edit')}
                      </button>
                      <button onClick={() => deleteEntry(entry.id)} className="text-slate-400 hover:text-red-600">
                        {t('common.delete')}
                      </button>
                    </td>
                  </tr>
                ),
              )}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-slate-400">
                    {t('team.noEntries')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">{t('team.reports')}</h2>
        {reports.length === 0 ? (
          <p className="text-sm text-slate-400">{t('team.noReports')}</p>
        ) : (
          <ul className="space-y-2">
            {reports.map((r) => (
              <li key={r.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
                <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                  <span>{new Date(r.receivedAt).toLocaleString(locale)}</span>
                  <span
                    className={`rounded px-2 py-0.5 font-medium ${
                      r.status === 'CONVERTED' ? 'bg-green-100 text-green-700' : r.status === 'DISMISSED' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {t(`status.${r.status}`)}
                  </span>
                </div>
                {r.rawText && <p className="text-slate-700">{r.rawText}</p>}
                {r.photoUrls.length > 0 && <p className="mt-1 text-xs text-slate-400">{t('team.photoCount', { count: r.photoUrls.length })}</p>}
              </li>
            ))}
          </ul>
        )}
        <Link to="/job-reports" className="mt-3 inline-block text-sm text-indigo-600 hover:underline">
          {t('team.reviewInJobReports')}
        </Link>
      </section>
    </div>
  );
}
