import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth, Business } from '../context/AuthContext';
import LogoMark from '../components/LogoMark';

const STATUS_LABEL: Record<string, string> = {
  trialing: 'Free trial',
  active: 'Active',
  past_due: 'Payment failed',
  canceled: 'Canceled',
  incomplete: 'Payment incomplete',
  incomplete_expired: 'Payment incomplete',
  unpaid: 'Unpaid',
};

function daysLeft(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

export default function Billing() {
  const { business: cachedBusiness, setBusiness, logout } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // The cached business from login can be stale - most importantly right
  // after coming back from a successful Checkout, where the whole point is
  // to see the new status immediately rather than whatever was true at
  // login time. Refetch on mount and keep AuthContext in sync too, so the
  // rest of the app (and a subsequent 402) sees it right away as well.
  useEffect(() => {
    api.get<Business>('/businesses/me').then(setBusiness);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const business = cachedBusiness;
  const status = business?.subscriptionStatus ?? 'trialing';
  const isActive = status === 'active';
  const isTrialing = status === 'trialing' && business?.trialEndsAt && daysLeft(business.trialEndsAt) > 0;
  const lapsed = !isActive && !isTrialing;

  async function goToCheckout() {
    setError(null);
    setSubmitting(true);
    try {
      const { url } = await api.post<{ url: string }>('/billing/checkout');
      window.location.href = url;
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  async function goToPortal() {
    setError(null);
    setSubmitting(true);
    try {
      const { url } = await api.post<{ url: string }>('/billing/portal');
      window.location.href = url;
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-slate-50 to-amber-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
        <div className="mb-6 flex flex-col items-center">
          <LogoMark size={48} />
          <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-900">Billing</h1>
        </div>

        {error && <div className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}

        <div className="mb-5 rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Status</span>
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                isActive
                  ? 'bg-green-100 text-green-700'
                  : isTrialing
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
              }`}
            >
              {STATUS_LABEL[status] ?? status}
            </span>
          </div>
          {isTrialing && business?.trialEndsAt && (
            <p className="mt-2 text-slate-600">
              {daysLeft(business.trialEndsAt)} day{daysLeft(business.trialEndsAt) === 1 ? '' : 's'} left in your free trial.
            </p>
          )}
          {isActive && business?.currentPeriodEnd && (
            <p className="mt-2 text-slate-600">Renews {new Date(business.currentPeriodEnd).toLocaleDateString()}.</p>
          )}
          {lapsed && (
            <p className="mt-2 text-red-700">
              Your subscription isn't active - the rest of the app is locked until this is resolved.
            </p>
          )}
        </div>

        {lapsed || isTrialing ? (
          <button
            onClick={goToCheckout}
            disabled={submitting}
            className="w-full rounded bg-indigo-600 py-2 text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? 'Redirecting...' : 'Subscribe - $5/month'}
          </button>
        ) : (
          <button
            onClick={goToPortal}
            disabled={submitting}
            className="w-full rounded bg-indigo-600 py-2 text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? 'Redirecting...' : 'Manage subscription'}
          </button>
        )}

        <div className="mt-4 flex items-center justify-between text-sm">
          {isActive || isTrialing ? (
            <Link to="/dashboard" className="text-indigo-600 hover:underline">
              &larr; Back to dashboard
            </Link>
          ) : (
            <span />
          )}
          <button onClick={logout} className="text-slate-400 underline hover:text-indigo-600">
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
