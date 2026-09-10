import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth, isLoggedIn, isSuperAdmin } from '../context/AuthContext';
import { useT } from '../i18n';
import LogoMark from '../components/LogoMark';
import LangToggle from '../components/LangToggle';

export default function Login() {
  const { login } = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isLoggedIn()) return <Navigate to={isSuperAdmin() ? '/platform' : '/dashboard'} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'SUPERADMIN' ? '/platform' : '/dashboard');
    } catch (err: any) {
      setError(err.message || t('login.error'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-slate-50 to-amber-50 px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
        <Link to="/" className="mb-6 flex flex-col items-center">
          <LogoMark size={48} />
          <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-900">manejoai</h1>
        </Link>
        {error && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
        <label className="mb-3 block text-sm">
          {t('login.email')}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </label>
        <label className="mb-4 block text-sm">
          {t('login.password')}
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-indigo-600 py-2 text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? t('login.submitting') : t('login.submit')}
        </button>

        <p className="mt-4 text-center text-sm text-slate-500">
          {t('login.newHere')}{' '}
          <Link to="/register" className="text-indigo-600 hover:underline">
            {t('login.createAccount')}
          </Link>
        </p>

        <div className="mt-4 flex justify-center">
          <LangToggle />
        </div>
      </form>
    </div>
  );
}
