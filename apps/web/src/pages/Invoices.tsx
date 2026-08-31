import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

interface Invoice {
  id: string;
  invoiceNumber: string;
  amountCents: number;
  status: string;
  dueDate: string;
  account: { name: string };
}
interface SendDraftsResult {
  sentCount: number;
  emailCount: number;
  skipped: { account: string; property: string | null; invoiceNumbers: string[]; reason: string }[];
}

const statuses = ['ALL', 'DRAFT', 'SENT', 'OVERDUE', 'PAID', 'CANCELED'];

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendDraftsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    const path = status === 'ALL' ? '/invoices' : `/invoices?status=${status}`;
    api
      .get<Invoice[]>(path)
      .then(setInvoices)
      .finally(() => setLoading(false));
  }

  useEffect(load, [status]);

  const draftCount = invoices.filter((i) => i.status === 'DRAFT').length;

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

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-slate-500">
              <tr>
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
                  <td colSpan={5} className="px-4 py-4 text-slate-400">
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
