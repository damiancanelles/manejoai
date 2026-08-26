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

const statuses = ['ALL', 'DRAFT', 'SENT', 'OVERDUE', 'PAID', 'CANCELED'];

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const path = status === 'ALL' ? '/invoices' : `/invoices?status=${status}`;
    api
      .get<Invoice[]>(path)
      .then(setInvoices)
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <Link to="/invoices/new" className="rounded bg-slate-900 px-4 py-2 text-sm text-white">
          New invoice
        </Link>
      </div>

      <div className="mb-4 flex gap-2">
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
