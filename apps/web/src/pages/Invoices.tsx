import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendDraftsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<{ amountCents: number; invoices: unknown[] } | null>(null);

  function load() {
    setLoading(true);
    const path = status === 'ALL' ? '/invoices' : `/invoices?status=${status}`;
    api
      .get<Invoice[]>(path)
      .then(setInvoices)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    setSelected(new Set());
    setShowPaymentForm(false);
  }, [status]);

  const draftCount = invoices.filter((i) => i.status === 'DRAFT').length;
  const payable = invoices.filter((i) => !UNPAYABLE.has(i.status));
  const allPayableSelected = payable.length > 0 && payable.every((i) => selected.has(i.id));

  const selectedInvoices = invoices.filter((i) => selected.has(i.id));
  const selectedAccountIds = new Set(selectedInvoices.map((i) => i.accountId));
  const selectedTotal = selectedInvoices.reduce((sum, i) => sum + i.amountCents, 0);
  const mixedAccounts = selectedAccountIds.size > 1;

  function toggleAll() {
    setSelected(allPayableSelected ? new Set() : new Set(payable.map((i) => i.id)));
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
    if (!confirm('This emails every draft invoice to its customer (grouped by property) and marks them Sent. Continue?')) {
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <div className="flex gap-2">
          <button
            onClick={sendAllDrafts}
            disabled={sending}
            className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send all drafts'}
          </button>
          <Link to="/invoices/new" className="rounded bg-slate-900 px-4 py-2 text-sm text-white">
            New invoice
          </Link>
        </div>
      </div>

      {error && <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {result && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          <p>
            Sent {result.sentCount} invoice{result.sentCount === 1 ? '' : 's'} in {result.emailCount} email
            {result.emailCount === 1 ? '' : 's'}.
          </p>
          {result.skipped.length > 0 && (
            <div className="mt-2 border-t border-green-200 pt-2 text-amber-800">
              <p className="font-medium">Skipped (no contact marked to receive invoices):</p>
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
          Recorded a payment of {money(paymentResult.amountCents)} covering {paymentResult.invoices.length} invoice
          {paymentResult.invoices.length === 1 ? '' : 's'}.
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded px-3 py-1 text-sm ${
                status === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        {draftCount > 0 && <p className="text-sm text-slate-500">{draftCount} draft(s) currently shown</p>}
      </div>

      {selected.size > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm">
          <span>
            {selected.size} invoice{selected.size === 1 ? '' : 's'} selected — {money(selectedTotal)}
            {mixedAccounts && (
              <span className="ml-2 text-red-600">
                Select invoices from one customer at a time to record a payment.
              </span>
            )}
          </span>
          <div className="flex gap-2">
            <button onClick={() => setSelected(new Set())} className="text-slate-500 hover:text-slate-700">
              Clear
            </button>
            <button
              onClick={() => setShowPaymentForm((v) => !v)}
              disabled={mixedAccounts}
              className="rounded bg-slate-900 px-3 py-1 text-white disabled:opacity-40"
            >
              Record payment
            </button>
          </div>
        </div>
      )}

      {showPaymentForm && !mixedAccounts && (
        <form onSubmit={recordPayment} className="mb-4 space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm">
          {paymentError && <div className="rounded bg-red-50 p-2 text-red-700">{paymentError}</div>}
          <div>
            <p className="mb-1 font-medium">
              {selectedInvoices.map((i) => i.invoiceNumber).join(', ')} — total {money(selectedTotal)}
            </p>
            <p className="text-slate-500">Recording for {selectedInvoices[0]?.account.name}</p>
          </div>
          <div className="flex gap-4">
            <label className="block">
              Payment date
              <input
                name="paidAt"
                type="date"
                defaultValue={todayStr()}
                required
                className="mt-1 rounded border border-slate-300 px-2 py-1"
              />
            </label>
            <label className="block flex-1">
              Notes (optional)
              <input
                name="notes"
                type="text"
                placeholder="e.g. Check #1234"
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={recordingPayment}
              className="rounded bg-slate-900 px-4 py-1.5 text-white disabled:opacity-50"
            >
              {recordingPayment ? 'Recording...' : 'Record payment'}
            </button>
            <button type="button" onClick={() => setShowPaymentForm(false)} className="rounded border border-slate-300 px-4 py-1.5">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-slate-500">
              <tr>
                <th className="w-8 px-4 py-2">
                  <input type="checkbox" checked={allPayableSelected} onChange={toggleAll} disabled={payable.length === 0} />
                </th>
                <th className="px-4 py-2">Invoice</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Due date</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
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
                    <Link to={`/invoices/${inv.id}`} className="text-blue-600 hover:underline">
                      {inv.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{inv.account.name}</td>
                  <td className="px-4 py-2">{money(inv.amountCents)}</td>
                  <td className="px-4 py-2">{inv.status}</td>
                  <td className="px-4 py-2">{new Date(inv.dueDate).toLocaleDateString()}</td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-slate-400">
                    No invoices.
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
