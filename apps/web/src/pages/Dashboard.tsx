import { useEffect, useState } from 'react';
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

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Overdue" value={String(overdue.length)} sub={`${money(overdueTotal)} outstanding`} tone="red" />
        <StatTile label="Sent, not yet due" value={String(sent.length)} tone="amber" />
        <StatTile label="Paid (all time)" value={money(paidTotal)} tone="green" />
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Gross income by month</h2>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <MonthlyIncomeChart data={monthly} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Gross income by customer</h2>
        <RankedTable rows={byCustomer} emptyLabel="No invoices yet." />
      </section>
    </div>
  );
}
