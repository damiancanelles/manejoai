import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth, Business } from '../context/AuthContext';
import { useI18n } from '../i18n';
import LogoMark from '../components/LogoMark';
import LangToggle from '../components/LangToggle';

const STATUS_LABEL_KEY: Record<string, string> = {
  trialing: 'billing.statusTrialing',
  active: 'billing.statusActive',
  past_due: 'billing.statusPastDue',
  canceled: 'billing.statusCanceled',
  incomplete: 'billing.statusIncomplete',
  incomplete_expired: 'billing.statusIncomplete',
  unpaid: 'billing.statusUnpaid',
};

function daysLeft(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

export default function Billing() {
  const { business: cachedBusiness, setBusiness, logout } = useAuth();
  const { t, locale } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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
  const tier = business?.subscriptionTier ?? 'pro';
  const isActive = status === 'active';
  const isTrialing = status === 'trialing' && business?.trialEndsAt && daysLeft(business.trialEndsAt) > 0;
  const lapsed = !isActive && !isTrialing;

  async function goToCheckout(plan: 'basic' | 'pro') {
    setError(null);
    setSubmitting(true);
    try {
      const { url } = await api.post<{ url: string }>('/billing/checkout', { tier: plan });
      window.location.href = url;
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  // Basic <-> Pro on an existing subscription, without leaving the app.
  // Stripe prorates the difference; the webhook + this response both keep
  // subscriptionTier in sync, so refetch to pick up the new label.
  async function changePlan(plan: 'basic' | 'pro') {
    if (plan === 'basic' && !window.confirm(t('billing.switchToBasicConfirm'))) return;
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      await api.post('/billing/change-plan', { tier: plan });
      const fresh = await api.get<Business>('/businesses/me');
      setBusiness(fresh);
      setNotice(plan === 'pro' ? t('billing.nowOnPro') : t('billing.nowOnBasic'));
    } catch (err: any) {
      setError(err.message);
    } finally {
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
          <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-900">{t('billing.title')}</h1>
        </div>

        {error && <div className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
        {notice && <div className="mb-4 rounded bg-green-50 p-2 text-sm text-green-700">{notice}</div>}

        <div className="mb-5 rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">{t('billing.status')}</span>
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                isActive
                  ? 'bg-green-100 text-green-700'
                  : isTrialing
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
              }`}
            >
              {STATUS_LABEL_KEY[status] ? t(STATUS_LABEL_KEY[status]) : status}
            </span>
          </div>
          {isTrialing && business?.trialEndsAt && (
            <p className="mt-2 text-slate-600">{t('billing.trialDaysLeft', { days: daysLeft(business.trialEndsAt) })}</p>
          )}
          {isActive && (
            <p className="mt-2 text-slate-600">
              {tier === 'pro' ? t('billing.proPlan') : t('billing.basicPlan')}
              {business?.currentPeriodEnd &&
                t('billing.renews', { date: new Date(business.currentPeriodEnd).toLocaleDateString(locale) })}
              .
            </p>
          )}
          {isTrialing && <p className="mt-1 text-slate-500">{t('billing.trialIncludesPro')}</p>}
          {lapsed && <p className="mt-2 text-red-700">{t('billing.lapsed')}</p>}
        </div>

        {lapsed || isTrialing ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-slate-900">{t('billing.basicName')}</span>
                <span className="text-sm text-slate-600">{t('billing.basicPrice')}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{t('billing.basicDesc')}</p>
              <button
                onClick={() => goToCheckout('basic')}
                disabled={submitting}
                className="mt-3 w-full rounded border border-indigo-600 py-2 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50 disabled:opacity-50"
              >
                {submitting ? t('common.redirecting') : t('billing.chooseBasic')}
              </button>
            </div>
            <div className="rounded-lg border-2 border-indigo-600 p-4">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-slate-900">{t('billing.proName')}</span>
                <span className="text-sm text-slate-600">{t('billing.proPrice')}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{t('billing.proDesc')}</p>
              <button
                onClick={() => goToCheckout('pro')}
                disabled={submitting}
                className="mt-3 w-full rounded bg-indigo-600 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? t('common.redirecting') : t('billing.choosePro')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {tier === 'basic' ? (
              <button
                onClick={() => changePlan('pro')}
                disabled={submitting}
                className="w-full rounded bg-indigo-600 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? t('common.working') : t('billing.upgradeToPro')}
              </button>
            ) : (
              <button
                onClick={() => changePlan('basic')}
                disabled={submitting}
                className="w-full rounded border border-slate-300 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                {submitting ? t('common.working') : t('billing.switchToBasic')}
              </button>
            )}
            <button
              onClick={goToPortal}
              disabled={submitting}
              className="w-full rounded bg-slate-100 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-50"
            >
              {submitting ? t('common.redirecting') : t('billing.manageSubscription')}
            </button>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-sm">
          {isActive || isTrialing ? (
            <Link to="/dashboard" className="text-indigo-600 hover:underline">
              {t('common.backToDashboard')}
            </Link>
          ) : (
            <span />
          )}
          <button onClick={logout} className="text-slate-400 underline hover:text-indigo-600">
            {t('common.logOut')}
          </button>
        </div>

        <div className="mt-4 flex justify-center">
          <LangToggle />
        </div>
      </div>
    </div>
  );
}
