import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

interface Invoice {
  id: string;
  invoiceNumber: string;
  amountCents: number;
  dueDate: string;
  status: string;
  account: { name: string };
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function Dashboard() {
  const [overdue, setOverdue] = useState<Invoice[]>([]);
  const [sent, setSent] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Invoice[]>('/invoices?status=OVERDUE'),
      api.get<Invoice[]>('/invoices?status=SENT'),
    ])
      .then(([o, s]) => {
        setOverdue(o);
        setSent(s);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading...</p>;

  const overdueTotal = overdue.reduce((sum, i) => sum + i.amountCents, 0);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="text-sm text-red-700">Overdue</div>
          <div className="text-2xl font-bold text-red-800">{overdue.length}</div>
          <div className="text-sm text-red-700">{money(overdueTotal)} outstanding</div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm text-amber-700">Sent, not yet due</div>
          <div className="text-2xl font-bold text-amber-800">{sent.length}</div>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Overdue invoices</h2>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Invoice</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Due date</th>
            </tr>
          </thead>
          <tbody>
            {overdue.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-4 text-slate-400">
                  Nothing overdue right now.
                </td>
              </tr>
            )}
            {overdue.map((inv) => (
              <tr key={inv.id} className="border-t border-slate-100">
                <td className="px-4 py-2">
                  <Link to={`/invoices/${inv.id}`} className="text-blue-600 hover:underline">
                    {inv.invoiceNumber}
                  </Link>
                </td>
                <td className="px-4 py-2">{inv.account.name}</td>
                <td className="px-4 py-2">{money(inv.amountCents)}</td>
                <td className="px-4 py-2">{new Date(inv.dueDate).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
