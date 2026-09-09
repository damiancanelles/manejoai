import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { money } from '../lib/invoiceStats';
import StatTile from '../components/StatTile';
import LogoMark from '../components/LogoMark';

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

function daysAgo(iso: string | null): string {
  if (!iso) return 'No activity yet';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

export default function PlatformDashboard() {
  const { logout } = useAuth();
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
          <span className="ml-2 rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">Platform</span>
        </div>
        <button onClick={logout} className="text-sm text-slate-500 underline hover:text-indigo-600">
          Log out
        </button>
      </header>

      <main className="mx-auto max-w-6xl p-4 sm:p-6">
        <h1 className="mb-6 text-2xl font-bold">Platform overview</h1>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile label="Businesses" value={String(stats.totalBusinesses)} sub={`+${stats.newBusinesses7d} this week`} tone="indigo" />
              <StatTile label="Users" value={String(stats.totalUsers)} tone="indigo" />
              <StatTile label="Customers (all businesses)" value={String(stats.totalAccounts)} tone="indigo" />
              <StatTile
                label="Invoiced (all time)"
                value={money(stats.totalInvoicedCents)}
                sub={`${stats.totalInvoices} invoices`}
                tone="green"
              />
              <StatTile label="Invoices this week" value={String(stats.invoicesCreated7d)} tone="amber" />
              <StatTile label="New businesses (30d)" value={String(stats.newBusinesses30d)} tone="indigo" />
              <StatTile label="Telegram connected" value={`${stats.businessesWithTelegram} / ${stats.totalBusinesses}`} tone="amber" />
            </div>

            <section>
              <h2 className="mb-3 text-lg font-semibold">Businesses</h2>
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                <table className="w-full min-w-[52rem] text-sm">
                  <thead className="bg-slate-100 text-left text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Business</th>
                      <th className="px-3 py-2">Created</th>
                      <th className="px-3 py-2 text-right">Users</th>
                      <th className="px-3 py-2 text-right">Customers</th>
                      <th className="px-3 py-2 text-right">Invoices</th>
                      <th className="px-3 py-2 text-right">Invoiced</th>
                      <th className="px-3 py-2">Telegram</th>
                      <th className="px-3 py-2">Last activity</th>
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
                              {b.telegramConfirmed ? 'Connected' : 'Set up, unconfirmed'}
                            </span>
                          ) : (
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Not connected</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-500">{daysAgo(b.lastActivityAt)}</td>
                      </tr>
                    ))}
                    {businesses.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-3 py-6 text-center text-slate-400">
                          No businesses yet.
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
