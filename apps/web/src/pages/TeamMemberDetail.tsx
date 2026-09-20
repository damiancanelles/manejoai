import { useEffect, useState } from 'react';
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
interface IncomingReportRow {
  id: string;
  rawText: string | null;
  photoUrls: string[];
  status: 'PENDING' | 'CONVERTED' | 'DISMISSED';
  receivedAt: string;
}

export default function TeamMemberDetail() {
  const { t, locale } = useI18n();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [member, setMember] = useState<CrewMember | null>(null);
  const [entries, setEntries] = useState<StatsTimeEntry[]>([]);
  const [reports, setReports] = useState<IncomingReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'day' | 'week'>('week');

  function load() {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.get<CrewMember>(`/users/${id}`),
      api.get<StatsTimeEntry[]>(`/time-entries?userId=${id}`),
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
