import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import Pagination from '../components/Pagination';
import { PAGE_SIZE, paginate } from '../lib/paginate';
import { useI18n } from '../i18n';

interface Invoice {
  id: string;
  invoiceNumber: string;
  amountCents: number;
  status: string;
  dueDate: string;
  accountId: string;
  account: { name: string };
}
interface SendDraftsResult {
  sentCount: number;
  emailCount: number;
  skipped: { account: string; property: string | null; invoiceNumbers: string[]; reason: string }[];
}

const statuses = ['ALL', 'DRAFT', 'SENT', 'OVERDUE', 'PAID', 'CANCELED'];
const UNPAYABLE = new Set(['PAID', 'CANCELED']);

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function Invoices() {
  const { t, locale } = useI18n();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendDraftsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<{ amountCents: number; invoices: unknown[] } | null>(null);

  // Debounce the free-text search so we're not firing a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (status !== 'ALL') params.set('status', status);
    if (debouncedSearch) params.set('search', debouncedSearch);
    api
      .get<Invoice[]>(`/invoices?${params.toString()}`)
      .then(setInvoices)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // Selections deliberately survive a filter/search change - the same
    // page-independent behavior already used for pagination - so building
    // up a multi-invoice pick via repeated searches doesn't lose earlier
    // picks. "Clear" and a successful payment are the only things that
    // reset it.
    setShowPaymentForm(false);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, debouncedSearch]);

  const draftCount = invoices.filter((i) => i.status === 'DRAFT').length;
  const pageInvoices = paginate(invoices, page);
  // "Select all" toggles just the page in view - selections themselves
  // persist across pages so a multi-page pick still works for payments.
  const payablePage = pageInvoices.filter((i) => !UNPAYABLE.has(i.status));
  const allPayablePageSelected = payablePage.length > 0 && payablePage.every((i) => selected.has(i.id));

  const selectedInvoices = invoices.filter((i) => selected.has(i.id));
  const selectedAccountIds = new Set(selectedInvoices.map((i) => i.accountId));
  const selectedTotal = selectedInvoices.reduce((sum, i) => sum + i.amountCents, 0);
  const mixedAccounts = selectedAccountIds.size > 1;

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPayablePageSelected) payablePage.forEach((i) => next.delete(i.id));
      else payablePage.forEach((i) => next.add(i.id));
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function sendAllDrafts() {
    if (!confirm(t('invoices.sendDraftsConfirm'))) {
      return;
    }
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post<SendDraftsResult>('/invoices/send-drafts');
      setResult(res);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function recordPayment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPaymentError(null);
    setRecordingPayment(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await api.post<{ amountCents: number; invoices: unknown[] }>('/payments', {
        invoiceIds: [...selected],
        paidAt: new Date(form.get('paidAt') as string).toISOString(),
        notes: (form.get('notes') as string) || undefined,
      });
      setPaymentResult(res);
      setSelected(new Set());
      setShowPaymentForm(false);
      load();
    } catch (err: any) {
      setPaymentError(err.message);
    } finally {
      setRecordingPayment(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('invoices.title')}</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={sendAllDrafts}
            disabled={sending}
            className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            {sending ? t('invoices.sending') : t('invoices.sendAllDrafts')}
          </button>
          <Link
            to="/invoices/new"
            className="rounded bg-indigo-600 px-4 py-2 text-sm text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            {t('invoices.new')}
          </Link>
        </div>
      </div>

      {error && <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {result && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          <p>{t('invoices.sentResult', { invoices: result.sentCount, emails: result.emailCount })}</p>
          {result.skipped.length > 0 && (
            <div className="mt-2 border-t border-green-200 pt-2 text-amber-800">
              <p className="font-medium">{t('invoices.skippedInvoices')}</p>
              <ul className="mt-1 list-disc pl-5">
                {result.skipped.map((s, i) => (
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

      {paymentResult && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          {t('invoices.paymentResult', {
            amount: money(paymentResult.amountCents),
            count: paymentResult.invoices.length,
          })}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded px-3 py-1 text-sm transition-colors ${
                status === s ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s === 'ALL' ? t('status.ALL') : t(`status.${s}`)}
            </button>
          ))}
        </div>
        {draftCount > 0 && <p className="text-sm text-slate-500">{t('invoices.draftsShown', { count: draftCount })}</p>}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('invoices.search')}
          className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm sm:ml-auto sm:w-72"
        />
      </div>

      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm">
          <span>
            {t('invoices.selectedSummary', { count: selected.size, amount: money(selectedTotal) })}
            {mixedAccounts && (
              <span className="ml-2 text-red-600">{t('invoices.mixedAccounts')}</span>
            )}
          </span>
          <div className="flex gap-2">
            <button onClick={() => setSelected(new Set())} className="text-slate-500 hover:text-slate-700">
              {t('invoices.clear')}
            </button>
            <button
              onClick={() => setShowPaymentForm((v) => !v)}
              disabled={mixedAccounts}
              className="rounded bg-indigo-600 px-3 py-1 text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-40"
            >
              {t('invoices.recordPayment')}
            </button>
          </div>
        </div>
      )}

      {showPaymentForm && !mixedAccounts && (
        <form onSubmit={recordPayment} className="mb-4 space-y-3 rounded-lg border border-slate-200 bg-white shadow-sm p-4 text-sm">
          {paymentError && <div className="rounded bg-red-50 p-2 text-red-700">{paymentError}</div>}
          <div>
            <p className="mb-1 font-medium">
              {t('invoices.paymentLine', {
                numbers: selectedInvoices.map((i) => i.invoiceNumber).join(', '),
                amount: money(selectedTotal),
              })}
            </p>
            <p className="text-slate-500">{t('invoices.recordingFor', { name: selectedInvoices[0]?.account.name ?? '' })}</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="block">
              {t('invoices.paymentDate')}
              <input
                name="paidAt"
                type="date"
                defaultValue={todayStr()}
                required
                className="mt-1 rounded border border-slate-300 px-2 py-1"
              />
            </label>
            <label className="block flex-1">
              {t('invoices.notes')}
              <input
                name="notes"
                type="text"
                placeholder={t('invoices.notesPlaceholder')}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={recordingPayment}
              className="rounded bg-indigo-600 px-4 py-1.5 text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {recordingPayment ? t('invoices.recording') : t('invoices.recordPayment')}
            </button>
            <button type="button" onClick={() => setShowPaymentForm(false)} className="rounded border border-slate-300 px-4 py-1.5">
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p>{t('common.loading')}</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left text-slate-500">
                <tr>
                  <th className="w-8 px-4 py-2">
                    <input
                      type="checkbox"
                      checked={allPayablePageSelected}
                      onChange={toggleAll}
                      disabled={payablePage.length === 0}
                    />
                  </th>
                  <th className="px-4 py-2">{t('invoices.colInvoice')}</th>
                  <th className="px-4 py-2">{t('invoices.colCustomer')}</th>
                  <th className="px-4 py-2">{t('invoices.colAmount')}</th>
                  <th className="px-4 py-2">{t('invoices.colStatus')}</th>
                  <th className="px-4 py-2">{t('invoices.colDueDate')}</th>
                </tr>
              </thead>
              <tbody>
                {pageInvoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(inv.id)}
                        onChange={() => toggleOne(inv.id)}
                        disabled={UNPAYABLE.has(inv.status)}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Link to={`/invoices/${inv.id}`} className="text-indigo-600 hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{inv.account.name}</td>
                    <td className="px-4 py-2">{money(inv.amountCents)}</td>
                    <td className="px-4 py-2">{t(`status.${inv.status}`)}</td>
                    <td className="px-4 py-2">{new Date(inv.dueDate).toLocaleDateString(locale)}</td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 text-slate-400">
                      {t('invoices.empty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalItems={invoices.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </>
      )}
    </div>
  );
}
