import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { downloadCsv } from '../lib/csv';
import { downloadInvoicesPdf } from '../lib/invoicePdf';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import Pagination from '../components/Pagination';
import { PAGE_SIZE, paginate } from '../lib/paginate';

interface Account {
  id: string;
  name: string;
  properties: { id: string; name: string }[];
}
interface Job {
  id: string;
  title: string;
  description?: string;
  status: string;
  createdAt: string;
  account: { name: string };
  property?: { name: string } | null;
}
interface InvoiceItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
}
interface Invoice {
  id: string;
  invoiceNumber: string;
  amountCents: number;
  status: string;
  issueDate: string;
  dueDate: string;
  title: string;
  account: { name: string };
  property?: {
    name: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    zip: string;
  } | null;
  job?: { title: string } | null;
  items: InvoiceItem[];
}

const jobStatuses = ['ALL', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'];
const invoiceStatuses = ['ALL', 'DRAFT', 'SENT', 'OVERDUE', 'PAID', 'CANCELED'];

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function Reports() {
  const t = useI18n().t;
  const [tab, setTab] = useState<'jobs' | 'invoices'>('jobs');
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    api.get<Account[]>('/accounts').then(setAccounts);
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{t('reports.title')}</h1>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab('jobs')}
          className={`rounded px-3 py-1 text-sm transition-colors ${tab === 'jobs' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          {t('reports.tabJobs')}
        </button>
        <button
          onClick={() => setTab('invoices')}
          className={`rounded px-3 py-1 text-sm transition-colors ${tab === 'invoices' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          {t('reports.tabInvoices')}
        </button>
      </div>

      {tab === 'jobs' ? <JobsReport accounts={accounts} /> : <InvoicesReport accounts={accounts} />}
    </div>
  );
}

function JobsReport({ accounts }: { accounts: Account[] }) {
  const { t, locale } = useI18n();
  const [accountId, setAccountId] = useState('');
  const [status, setStatus] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Debounce the free-text search so we're not firing a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    const params = new URLSearchParams();
    if (accountId) params.set('accountId', accountId);
    if (status !== 'ALL') params.set('status', status);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (debouncedSearch) params.set('search', debouncedSearch);
    api
      .get<Job[]>(`/jobs?${params.toString()}`)
      .then(setJobs)
      .finally(() => setLoading(false));
  }, [accountId, status, dateFrom, dateTo, debouncedSearch]);

  const pageJobs = paginate(jobs, page);

  function exportCsv() {
    downloadCsv(
      `jobs-report-${todayStr()}.csv`,
      [
        t('reports.csvTitle'),
        t('reports.csvDescription'),
        t('reports.csvStatus'),
        t('reports.csvCustomer'),
        t('reports.csvProperty'),
        t('reports.csvLoggedDate'),
      ],
      jobs.map((j) => [
        j.title,
        j.description || '',
        t(`status.${j.status}`),
        j.account.name,
        j.property?.name || '',
        new Date(j.createdAt).toLocaleDateString(locale),
      ]),
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white shadow-sm p-4 text-sm">
        <label className="block">
          {t('reports.customer')}
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="mt-1 rounded border border-slate-300 px-2 py-1"
          >
            <option value="">{t('reports.allCustomers')}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          {t('reports.status')}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 rounded border border-slate-300 px-2 py-1"
          >
            {jobStatuses.map((s) => (
              <option key={s} value={s}>
                {s === 'ALL' ? t('status.ALL') : t(`status.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          {t('reports.from')}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="mt-1 rounded border border-slate-300 px-2 py-1"
          />
        </label>
        <label className="block">
          {t('reports.to')}
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="mt-1 rounded border border-slate-300 px-2 py-1"
          />
        </label>
        <label className="block flex-1">
          {t('reports.searchTitleDesc')}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('reports.searchPlaceholder')}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
          />
        </label>
        <button
          onClick={exportCsv}
          disabled={jobs.length === 0}
          className="rounded bg-indigo-600 px-4 py-1.5 text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-40"
        >
          {t('reports.exportCsv')}
        </button>
      </div>

      <p className="mb-2 text-sm text-slate-500">{loading ? t('common.loading') : t('reports.jobCount', { count: jobs.length })}</p>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">{t('reports.colJob')}</th>
              <th className="px-4 py-2">{t('reports.colCustomer')}</th>
              <th className="px-4 py-2">{t('reports.colProperty')}</th>
              <th className="px-4 py-2">{t('reports.colStatus')}</th>
              <th className="px-4 py-2">{t('reports.colLogged')}</th>
            </tr>
          </thead>
          <tbody>
            {pageJobs.map((j) => (
              <tr key={j.id} className="border-t border-slate-100">
                <td className="px-4 py-2">
                  <Link to={`/jobs/${j.id}`} className="text-indigo-600 hover:underline">
                    {j.title}
                  </Link>
                </td>
                <td className="px-4 py-2">{j.account.name}</td>
                <td className="px-4 py-2">{j.property?.name || '—'}</td>
                <td className="px-4 py-2">{t(`status.${j.status}`)}</td>
                <td className="px-4 py-2">{new Date(j.createdAt).toLocaleDateString(locale)}</td>
              </tr>
            ))}
            {!loading && jobs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-slate-400">
                  {t('reports.noJobs')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalItems={jobs.length} pageSize={PAGE_SIZE} onChange={setPage} />
    </div>
  );
}

interface SendReportResult {
  emailCount: number;
  invoiceCount: number;
  skipped: { account: string; property: string | null; invoiceNumbers: string[]; reason: string }[];
}

function InvoicesReport({ accounts }: { accounts: Account[] }) {
  const { business } = useAuth();
  const { t, locale } = useI18n();
  const [accountId, setAccountId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [status, setStatus] = useState('PAID');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendReportResult | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const selectedAccount = accounts.find((a) => a.id === accountId);

  function filterParams() {
    const params = new URLSearchParams();
    if (accountId) params.set('accountId', accountId);
    if (propertyId) params.set('propertyId', propertyId);
    if (status !== 'ALL') params.set('status', status);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    return params;
  }

  useEffect(() => {
    setLoading(true);
    setPage(1);
    const params = filterParams();
    params.set('full', 'true');
    api
      .get<Invoice[]>(`/invoices?${params.toString()}`)
      .then(setInvoices)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, propertyId, status, dateFrom, dateTo]);

  const totalCents = invoices.reduce((sum, inv) => sum + inv.amountCents, 0);
  const pageInvoices = paginate(invoices, page);

  function exportPdf() {
    if (!business) return;
    downloadInvoicesPdf(invoices, business);
  }

  async function sendToCustomers() {
    const customerCount = new Set(invoices.map((i) => i.account.name)).size;
    if (!confirm(t('reports.sendConfirm', { invoices: invoices.length, customers: customerCount }))) {
      return;
    }
    setSending(true);
    setSendError(null);
    setSendResult(null);
    try {
      const res = await api.post<SendReportResult>(`/invoices/send-report?${filterParams().toString()}`);
      setSendResult(res);
    } catch (err: any) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white shadow-sm p-4 text-sm">
        <label className="block">
          {t('reports.customer')}
          <select
            value={accountId}
            onChange={(e) => {
              setAccountId(e.target.value);
              setPropertyId('');
            }}
            className="mt-1 rounded border border-slate-300 px-2 py-1"
          >
            <option value="">{t('reports.allCustomers')}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          {t('reports.property')}
          <select
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            disabled={!selectedAccount || selectedAccount.properties.length === 0}
            className="mt-1 rounded border border-slate-300 px-2 py-1 disabled:opacity-50"
          >
            <option value="">{t('reports.allProperties')}</option>
            {selectedAccount?.properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          {t('reports.status')}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 rounded border border-slate-300 px-2 py-1"
          >
            {invoiceStatuses.map((s) => (
              <option key={s} value={s}>
                {s === 'ALL' ? t('status.ALL') : t(`status.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          {t('reports.from')}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="mt-1 rounded border border-slate-300 px-2 py-1"
          />
        </label>
        <label className="block">
          {t('reports.to')}
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="mt-1 rounded border border-slate-300 px-2 py-1"
          />
        </label>
        <button
          onClick={exportPdf}
          disabled={invoices.length === 0}
          className="rounded border border-slate-300 px-4 py-1.5 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
        >
          {t('reports.downloadPdfs')}
        </button>
        <button
          onClick={sendToCustomers}
          disabled={invoices.length === 0 || sending}
          className="rounded bg-indigo-600 px-4 py-1.5 text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-40"
        >
          {sending ? t('reports.sending') : t('reports.sendToCustomers')}
        </button>
      </div>

      {sendError && <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{sendError}</div>}

      {sendResult && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          <p>{t('reports.sendResult', { invoices: sendResult.invoiceCount, emails: sendResult.emailCount })}</p>
          {sendResult.skipped.length > 0 && (
            <div className="mt-2 border-t border-green-200 pt-2 text-amber-800">
              <p className="font-medium">{t('reports.skipped')}</p>
              <ul className="mt-1 list-disc pl-5">
                {sendResult.skipped.map((s, i) => (
                  <li key={i}>
                    {s.account}
                    {s.property && ` — ${s.property}`}: {s.invoiceNumbers.join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <p className="mb-2 text-sm text-slate-500">
        {loading ? t('common.loading') : t('reports.invoiceSummary', { count: invoices.length, amount: money(totalCents) })}
      </p>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">{t('reports.colInvoice')}</th>
              <th className="px-4 py-2">{t('reports.colCustomer')}</th>
              <th className="px-4 py-2">{t('reports.colAmount')}</th>
              <th className="px-4 py-2">{t('reports.colStatus')}</th>
              <th className="px-4 py-2">{t('reports.colIssued')}</th>
              <th className="px-4 py-2">{t('reports.colDueDate')}</th>
            </tr>
          </thead>
          <tbody>
            {pageInvoices.map((inv) => (
              <tr key={inv.id} className="border-t border-slate-100">
                <td className="px-4 py-2">
                  <Link to={`/invoices/${inv.id}`} className="text-indigo-600 hover:underline">
                    {inv.invoiceNumber}
                  </Link>
                </td>
                <td className="px-4 py-2">{inv.account.name}</td>
                <td className="px-4 py-2">{money(inv.amountCents)}</td>
                <td className="px-4 py-2">{t(`status.${inv.status}`)}</td>
                <td className="px-4 py-2">{new Date(inv.issueDate).toLocaleDateString(locale)}</td>
                <td className="px-4 py-2">{new Date(inv.dueDate).toLocaleDateString(locale)}</td>
              </tr>
            ))}
            {!loading && invoices.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-slate-400">
                  {t('reports.noInvoices')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalItems={invoices.length} pageSize={PAGE_SIZE} onChange={setPage} />
    </div>
  );
}
