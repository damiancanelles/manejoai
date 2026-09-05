import { useEffect, useState } from 'react';
import { api } from '../api/client';
import StatTile from '../components/StatTile';
import MonthlyIncomeChart from '../components/MonthlyIncomeChart';
import RankedTable from '../components/RankedTable';
import YearSwitcher from '../components/YearSwitcher';
import { sumByStatus, monthlyIncome, incomeByCustomer, yearsWithInvoices, money } from '../lib/invoiceStats';

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
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    api
      .get<Invoice[]>('/invoices')
      .then((data) => {
        setInvoices(data);
        const years = yearsWithInvoices(data);
        if (years.length > 0) setYear(years[0]); // most recent year with data
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading...</p>;

  const years = yearsWithInvoices(invoices);
  const yearLabel = year != null ? `${year}` : 'all time';

  const scoped = invoices.filter((i) => year == null || new Date(i.issueDate).getFullYear() === year);
  const overdue = scoped.filter((i) => i.status === 'OVERDUE');
  const sent = scoped.filter((i) => i.status === 'SENT');
  const overdueTotal = sumByStatus(invoices, 'OVERDUE', year);
  const paidTotal = sumByStatus(invoices, 'PAID', year);
  const monthly = monthlyIncome(invoices, year);
  const byCustomer = incomeByCustomer(invoices, year);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <YearSwitcher years={years} selected={year} onChange={setYear} />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label={`Overdue (${yearLabel})`}
          value={String(overdue.length)}
          sub={`${money(overdueTotal)} outstanding`}
          tone="red"
        />
        <StatTile label={`Sent, not yet due (${yearLabel})`} value={String(sent.length)} tone="amber" />
        <StatTile label={`Paid (${yearLabel})`} value={money(paidTotal)} tone="green" />
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
