import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth, isLoggedIn, isSuperAdmin } from '../context/AuthContext';
import { useT } from '../i18n';
import LogoMark from '../components/LogoMark';
import LangToggle from '../components/LangToggle';

const inputClass =
  'mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

export default function Register() {
  const { register } = useAuth();
  const t = useT();
  const navigate = useNavigate();

  const [businessName, setBusinessName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isLoggedIn()) return <Navigate to={isSuperAdmin() ? '/platform' : '/dashboard'} replace />;

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
      await register({
        businessName,
        addressLine1,
        addressLine2: addressLine2 || undefined,
        phone: phone || undefined,
        name,
        email,
        password,
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || t('register.errGeneric'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-slate-50 to-amber-50 px-4 py-10">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
        <Link to="/" className="mb-6 flex flex-col items-center">
          <LogoMark size={48} />
          <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-900">{t('register.title')}</h1>
        </Link>
        {error && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t('register.businessInfo')}</p>
        <label className="mb-3 block text-sm">
          {t('register.businessName')}
          <input required value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={inputClass} />
        </label>
        <label className="mb-3 block text-sm">
          {t('register.address')}
          <input
            required
            placeholder={t('register.streetAddress')}
            value={addressLine1}
            onChange={(e) => setAddressLine1(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="mb-3 block text-sm">
          <input
            placeholder={t('register.cityStateZip')}
            value={addressLine2}
            onChange={(e) => setAddressLine2(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="mb-4 block text-sm">
          {t('register.phoneOptional')}
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
        </label>

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t('register.yourAccount')}</p>
        <label className="mb-3 block text-sm">
          {t('register.yourName')}
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </label>
        <label className="mb-3 block text-sm">
          {t('register.email')}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="mb-3 block text-sm">
          {t('register.password')}
          <input
            type="password"
            required
            minLength={8}
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
          {submitting ? t('register.submitting') : t('register.submit')}
        </button>

        <p className="mt-4 text-center text-sm text-slate-500">
          {t('register.haveAccount')}{' '}
          <Link to="/login" className="text-indigo-600 hover:underline">
            {t('register.signIn')}
          </Link>
        </p>

        <div className="mt-4 flex justify-center">
          <LangToggle />
        </div>
      </form>
    </div>
  );
}
