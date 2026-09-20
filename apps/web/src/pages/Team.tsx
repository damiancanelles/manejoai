import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useT } from '../i18n';

interface CrewMember {
  id: string;
  name: string;
  email: string;
  active: boolean;
  createdAt: string;
}
interface TimeEntryRow {
  userId: string;
  clockOut: string | null;
}

export default function Team() {
  const t = useT();
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [clockedInIds, setClockedInIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([api.get<CrewMember[]>('/users'), api.get<TimeEntryRow[]>('/time-entries')])
      .then(([members, entries]) => {
        setCrew(members);
        setClockedInIds(new Set(entries.filter((e) => !e.clockOut).map((e) => e.userId)));
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/users', { name, email, password });
      setName('');
      setEmail('');
      setPassword('');
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function deactivate(id: string) {
    if (!confirm(t('team.deactivateConfirm'))) return;
    await api.delete(`/users/${id}`);
    load();
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('team.title')}</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded bg-indigo-600 px-4 py-2 text-sm text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          {showForm ? t('common.cancel') : t('team.add')}
        </button>
      </div>
      <p className="mb-6 text-sm text-slate-500">{t('team.subtitle')}</p>

      {showForm && (
        <form onSubmit={onSubmit} className="mb-6 space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          {error && <div className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
          <div className="flex flex-wrap gap-3">
            <label className="text-sm">
              {t('team.name')}
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 sm:w-56"
              />
            </label>
            <label className="text-sm">
              {t('team.email')}
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 sm:w-64"
              />
            </label>
            <label className="text-sm">
              {t('team.password')}
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 sm:w-56"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-indigo-600 px-4 py-2 text-sm text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? t('common.saving') : t('team.create')}
          </button>
        </form>
      )}

      {loading ? (
        <p>{t('common.loading')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2">{t('team.colName')}</th>
                <th className="px-4 py-2">{t('team.colEmail')}</th>
                <th className="px-4 py-2">{t('team.colStatus')}</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {crew.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">
                    <Link to={`/team/${c.id}`} className="text-indigo-600 hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-500">{c.email}</td>
                  <td className="px-4 py-2">
                    {!c.active ? (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">{t('team.deactivated')}</span>
                    ) : clockedInIds.has(c.id) ? (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">{t('team.clockedIn')}</span>
                    ) : (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{t('team.active')}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {c.active && (
                      <button onClick={() => deactivate(c.id)} className="text-slate-400 hover:text-red-600">
                        {t('team.deactivate')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {crew.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-slate-400">
                    {t('team.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
