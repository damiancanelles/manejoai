import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import StatTile from '../components/StatTile';
import MonthlyIncomeChart from '../components/MonthlyIncomeChart';
import RankedTable from '../components/RankedTable';
import { sumByStatus, monthlyIncome, incomeByCustomer, money } from '../lib/invoiceStats';

interface Invoice {
  id: string;
  invoiceNumber: string;
  amountCents: number;
  dueDate: string;
  issueDate: string;
  paidAt?: string | null;
  status: string;
  account: { name: string };
}

export default function Dashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Invoice[]>('/invoices')
      .then(setInvoices)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading...</p>;

  const overdue = invoices.filter((i) => i.status === 'OVERDUE');
  const sent = invoices.filter((i) => i.status === 'SENT');
  const overdueTotal = sumByStatus(invoices, 'OVERDUE');
  const paidTotal = sumByStatus(invoices, 'PAID');
  const monthly = monthlyIncome(invoices);
  const byCustomer = incomeByCustomer(invoices);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <StatTile label="Overdue" value={String(overdue.length)} sub={`${money(overdueTotal)} outstanding`} tone="red" />
        <StatTile label="Sent, not yet due" value={String(sent.length)} tone="amber" />
        <StatTile label="Paid (all time)" value={money(paidTotal)} tone="green" />
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Gross income by month</h2>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <MonthlyIncomeChart data={monthly} />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Gross income by customer</h2>
        <RankedTable rows={byCustomer} emptyLabel="No paid invoices yet." />
      </section>

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
