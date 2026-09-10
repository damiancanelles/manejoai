import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import { money } from '../lib/invoiceStats';
import StatTile from '../components/StatTile';
import LogoMark from '../components/LogoMark';
import LangToggle from '../components/LangToggle';

type TFn = (key: string, vars?: Record<string, string | number>) => string;

interface PlatformStats {
  totalBusinesses: number;
  newBusinesses7d: number;
  newBusinesses30d: number;
  totalUsers: number;
  totalAccounts: number;
  totalInvoices: number;
  totalInvoicedCents: number;
  invoicesCreated7d: number;
  businessesWithTelegram: number;
}

interface BusinessRow {
  id: string;
  name: string;
  emailSlug: string;
  createdAt: string;
  userCount: number;
  accountCount: number;
  invoiceCount: number;
  totalInvoicedCents: number;
  telegramConnected: boolean;
  telegramConfirmed: boolean;
  lastActivityAt: string | null;
}

function daysAgo(iso: string | null, t: TFn): string {
  if (!iso) return t('platform.noActivity');
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return t('platform.today');
  if (days === 1) return t('platform.yesterday');
  return t('platform.daysAgo', { days });
}

export default function PlatformDashboard() {
  const { logout } = useAuth();
  const t = useI18n().t;
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [businesses, setBusinesses] = useState<BusinessRow[] | null>(null);

  useEffect(() => {
    api.get<PlatformStats>('/platform/stats').then(setStats);
    api.get<BusinessRow[]>('/platform/businesses').then(setBusinesses);
  }, []);

  const loading = !stats || !businesses;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6">
        <div className="flex items-center gap-2">
          <LogoMark size={28} />
          <span className="text-lg font-bold tracking-tight text-slate-900">manejoai</span>
          <span className="ml-2 rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">{t('platform.badge')}</span>
        </div>
        <div className="flex items-center gap-3">
          <LangToggle />
          <button onClick={logout} className="text-sm text-slate-500 underline hover:text-indigo-600">
            {t('common.logOut')}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4 sm:p-6">
        <h1 className="mb-6 text-2xl font-bold">{t('platform.title')}</h1>

        {loading ? (
          <p>{t('common.loading')}</p>
        ) : (
          <>
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile label={t('platform.businesses')} value={String(stats.totalBusinesses)} sub={t('platform.businessesSub', { count: stats.newBusinesses7d })} tone="indigo" />
              <StatTile label={t('platform.users')} value={String(stats.totalUsers)} tone="indigo" />
              <StatTile label={t('platform.customersAll')} value={String(stats.totalAccounts)} tone="indigo" />
              <StatTile
                label={t('platform.invoicedAllTime')}
                value={money(stats.totalInvoicedCents)}
                sub={t('platform.invoicedSub', { count: stats.totalInvoices })}
                tone="green"
              />
              <StatTile label={t('platform.invoicesThisWeek')} value={String(stats.invoicesCreated7d)} tone="amber" />
              <StatTile label={t('platform.newBusinesses30d')} value={String(stats.newBusinesses30d)} tone="indigo" />
              <StatTile label={t('platform.telegramConnected')} value={`${stats.businessesWithTelegram} / ${stats.totalBusinesses}`} tone="amber" />
            </div>

            <section>
              <h2 className="mb-3 text-lg font-semibold">{t('platform.businesses')}</h2>
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                <table className="w-full min-w-[52rem] text-sm">
                  <thead className="bg-slate-100 text-left text-slate-500">
                    <tr>
                      <th className="px-3 py-2">{t('platform.colBusiness')}</th>
                      <th className="px-3 py-2">{t('platform.colCreated')}</th>
                      <th className="px-3 py-2 text-right">{t('platform.colUsers')}</th>
                      <th className="px-3 py-2 text-right">{t('platform.colCustomers')}</th>
                      <th className="px-3 py-2 text-right">{t('platform.colInvoices')}</th>
                      <th className="px-3 py-2 text-right">{t('platform.colInvoiced')}</th>
                      <th className="px-3 py-2">{t('platform.colTelegram')}</th>
                      <th className="px-3 py-2">{t('platform.colLastActivity')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {businesses.map((b) => (
                      <tr key={b.id} className="border-t border-slate-100">
                        <td className="px-3 py-2">
                          <div className="font-medium text-slate-800">{b.name}</div>
                          <div className="text-xs text-slate-400">{b.emailSlug}@manejoai.cloud</div>
                        </td>
                        <td className="px-3 py-2 text-slate-500">{new Date(b.createdAt).toLocaleDateString()}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{b.userCount}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{b.accountCount}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{b.invoiceCount}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{money(b.totalInvoicedCents)}</td>
                        <td className="px-3 py-2">
                          {b.telegramConnected ? (
                            <span className={`rounded px-2 py-0.5 text-xs ${b.telegramConfirmed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                              {b.telegramConfirmed ? t('platform.tgConnected') : t('platform.tgUnconfirmed')}
                            </span>
                          ) : (
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{t('platform.tgNotConnected')}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-500">{daysAgo(b.lastActivityAt, t)}</td>
                      </tr>
                    ))}
                    {businesses.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-3 py-6 text-center text-slate-400">
                          {t('platform.noBusinesses')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
