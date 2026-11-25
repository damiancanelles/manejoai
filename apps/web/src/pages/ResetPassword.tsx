import { FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useT } from '../i18n';
import LogoMark from '../components/LogoMark';
import LangToggle from '../components/LangToggle';

const inputClass =
  'mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

// Landing page for the link in the "reset your password" email:
// /reset-password?token=...
export default function ResetPassword() {
  const t = useT();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError(t('register.errMismatch'));
      return;
    }
    if (password.length < 8) {
      setError(t('register.errShort'));
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
    } catch (err: any) {
      setError(err.message || t('reset.error'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-slate-50 to-amber-50 px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
        <Link to="/" className="mb-6 flex flex-col items-center">
          <LogoMark size={48} />
          <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-900">{t('reset.title')}</h1>
        </Link>

        {!token ? (
          <p className="rounded bg-red-50 p-3 text-sm text-red-700">{t('reset.missingToken')}</p>
        ) : done ? (
          <p className="rounded bg-green-50 p-3 text-sm text-green-800">{t('reset.done')}</p>
        ) : (
          <>
            {error && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
            <label className="mb-3 block text-sm">
              {t('reset.newPassword')}
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="mb-4 block text-sm">
              {t('register.confirmPassword')}
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded bg-indigo-600 py-2 text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? t('common.saving') : t('reset.submit')}
            </button>
          </>
        )}

        <p className="mt-4 text-center text-sm text-slate-500">
          <Link to={done ? '/login' : '/forgot-password'} className="text-indigo-600 hover:underline">
            {done ? t('reset.goToLogin') : t('reset.requestNew')}
          </Link>
        </p>

        <div className="mt-4 flex justify-center">
          <LangToggle />
        </div>
      </form>
    </div>
  );
}
