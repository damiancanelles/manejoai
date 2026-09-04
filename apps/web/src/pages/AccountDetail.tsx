import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import StatTile from '../components/StatTile';
import MonthlyIncomeChart from '../components/MonthlyIncomeChart';
import RankedTable from '../components/RankedTable';
import { sumByStatus, monthlyIncome, incomeByProperty, money } from '../lib/invoiceStats';

interface Property {
  id: string;
  name: string;
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
}
interface Contact {
  id: string;
  role: string;
  name: string;
  email?: string;
  phone?: string;
  receivesInvoices: boolean;
  receivesReminders: boolean;
  property?: { id: string; name: string } | null;
}
interface Job {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}
interface Invoice {
  id: string;
  invoiceNumber: string;
  amountCents: number;
  status: string;
  dueDate: string;
  issueDate: string;
  paidAt?: string | null;
  propertyId?: string | null;
}
interface Quote {
  id: string;
  quoteNumber: string;
  amountCents: number;
  status: string;
  issueDate: string;
}
interface Payment {
  id: string;
  paidAt: string;
  amountCents: number;
  notes?: string | null;
  invoices: { id: string; invoiceNumber: string }[];
}
interface Account {
  id: string;
  name: string;
  type: string;
  properties: Property[];
  contacts: Contact[];
  jobs: Job[];
  quotes: Quote[];
  invoices: Invoice[];
  payments: Payment[];
}
interface ReminderResult {
  flaggedOverdue: number;
  invoicesIncluded: number;
  emailsSent: number;
  skipped: { account: string; property: string | null; invoiceNumbers: string[] }[];
}

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const [account, setAccount] = useState<Account | null>(null);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderResult, setReminderResult] = useState<ReminderResult | null>(null);
  const [reminderError, setReminderError] = useState<string | null>(null);

  function load() {
    if (!id) return;
    api.get<Account>(`/accounts/${id}`).then(setAccount);
  }

  useEffect(load, [id]);

  if (!account) return <p>Loading...</p>;

  async function addProperty(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await api.post('/properties', {
      accountId: id,
      name: form.get('name'),
      addressLine1: form.get('addressLine1'),
      city: form.get('city'),
      state: form.get('state'),
      zip: form.get('zip'),
    });
    setShowPropertyForm(false);
    load();
  }

  async function addContact(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await api.post('/contacts', {
      accountId: id,
      propertyId: (form.get('propertyId') as string) || undefined,
      role: form.get('role'),
      name: form.get('name'),
      email: form.get('email') || undefined,
      phone: form.get('phone') || undefined,
      receivesInvoices: form.get('receivesInvoices') === 'on',
      receivesReminders: form.get('receivesReminders') === 'on',
    });
    setShowContactForm(false);
    load();
  }

  async function sendPaymentReminder() {
    if (
      !confirm(
        "This finds this customer's overdue invoices and emails a reminder to each property's contact, same as the weekly automated reminder. Continue?",
      )
    ) {
      return;
    }
    setSendingReminder(true);
    setReminderError(null);
    setReminderResult(null);
    try {
      const res = await api.post<ReminderResult>(`/reminders/run?accountId=${id}`);
      setReminderResult(res);
      load();
    } catch (err: any) {
      setReminderError(err.message);
    } finally {
      setSendingReminder(false);
    }
  }

  async function undoPayment(paymentId: string) {
    if (!confirm('This un-marks every invoice in this payment as paid (reverting to Sent or Overdue). Continue?')) {
      return;
    }
    await api.delete(`/payments/${paymentId}`);
    load();
  }

  async function addJob(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await api.post('/jobs', {
      accountId: id,
      title: form.get('title'),
      description: form.get('description') || undefined,
    });
    setShowJobForm(false);
    load();
  }

  const paidTotal = sumByStatus(account.invoices, 'PAID');
  const overdueTotal = sumByStatus(account.invoices, 'OVERDUE');
  const monthly = monthlyIncome(account.invoices);
  const propertyNames = new Map(account.properties.map((p) => [p.id, p.name]));
  const byProperty = incomeByProperty(account.invoices, propertyNames);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{account.name}</h1>
          <p className="text-sm text-slate-500">
            {account.type === 'MULTIFAMILY' ? 'Multifamily / property owner' : 'Individual customer'}
          </p>
        </div>
        <button
          onClick={sendPaymentReminder}
          disabled={sendingReminder}
          className="shrink-0 rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          {sendingReminder ? 'Sending...' : 'Send payment reminder'}
        </button>
      </div>

      {reminderError && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{reminderError}</div>}

      {reminderResult && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          {reminderResult.emailsSent > 0 ? (
            <p>
              Sent {reminderResult.emailsSent} reminder email{reminderResult.emailsSent === 1 ? '' : 's'} covering{' '}
              {reminderResult.invoicesIncluded} overdue invoice{reminderResult.invoicesIncluded === 1 ? '' : 's'}.
            </p>
          ) : (
            <p>No reminder emails to send — nothing overdue past the grace period right now.</p>
          )}
          {reminderResult.skipped.length > 0 && (
            <div className="mt-2 border-t border-green-200 pt-2 text-amber-800">
              <p className="font-medium">Skipped (no contact marked to receive reminders):</p>
              <ul className="mt-1 list-disc pl-5">
                {reminderResult.skipped.map((s, i) => (
                  <li key={i}>
                    {s.property || 'Whole account'}: {s.invoiceNumbers.join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Financials */}
      <section>
        <div className="mb-3 grid grid-cols-2 gap-4">
          <StatTile label="Paid (all time)" value={money(paidTotal)} tone="green" />
          <StatTile label="Overdue" value={money(overdueTotal)} tone="red" />
        </div>
        <h2 className="mb-2 text-lg font-semibold">Gross income by month</h2>
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
          <MonthlyIncomeChart data={monthly} />
        </div>
        {account.properties.length > 0 && (
          <>
            <h2 className="mb-2 text-lg font-semibold">Gross income by property</h2>
            <RankedTable rows={byProperty} emptyLabel="No paid invoices yet." />
          </>
        )}
      </section>

      {/* Properties */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Properties</h2>
          <button onClick={() => setShowPropertyForm((v) => !v)} className="text-sm text-blue-600">
            {showPropertyForm ? 'Cancel' : '+ Add property'}
          </button>
        </div>
        {showPropertyForm && (
          <form onSubmit={addProperty} className="mb-3 grid grid-cols-5 gap-2 rounded border border-slate-200 bg-white p-3 text-sm">
            <input name="name" placeholder="Property name" required className="rounded border border-slate-300 px-2 py-1" />
            <input name="addressLine1" placeholder="Address" required className="rounded border border-slate-300 px-2 py-1" />
            <input name="city" placeholder="City" required className="rounded border border-slate-300 px-2 py-1" />
            <input name="state" placeholder="State" required className="rounded border border-slate-300 px-2 py-1" />
            <div className="flex gap-1">
              <input name="zip" placeholder="ZIP" required className="w-full rounded border border-slate-300 px-2 py-1" />
              <button type="submit" className="rounded bg-slate-900 px-3 text-white">
                Add
              </button>
            </div>
          </form>
        )}
        <ul className="space-y-1 text-sm">
          {account.properties.map((p) => (
            <li key={p.id} className="rounded border border-slate-200 bg-white px-3 py-2">
              <span className="font-medium">{p.name}</span> — {p.addressLine1}, {p.city}, {p.state} {p.zip}
            </li>
          ))}
          {account.properties.length === 0 && <li className="text-slate-400">No properties yet.</li>}
        </ul>
      </section>

      {/* Contacts */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Contacts</h2>
          <button onClick={() => setShowContactForm((v) => !v)} className="text-sm text-blue-600">
            {showContactForm ? 'Cancel' : '+ Add contact'}
          </button>
        </div>
        {showContactForm && (
          <form onSubmit={addContact} className="mb-3 space-y-2 rounded border border-slate-200 bg-white p-3 text-sm">
            <div className="grid grid-cols-4 gap-2">
              <select name="role" className="rounded border border-slate-300 px-2 py-1">
                <option value="OWNER">Owner</option>
                <option value="SALES">Sales</option>
                <option value="INVOICING">Invoicing / AP</option>
                <option value="GENERAL">General</option>
              </select>
              <input name="name" placeholder="Name" required className="rounded border border-slate-300 px-2 py-1" />
              <input name="email" placeholder="Email" type="email" className="rounded border border-slate-300 px-2 py-1" />
              <input name="phone" placeholder="Phone" className="rounded border border-slate-300 px-2 py-1" />
            </div>
            {account.properties.length > 0 && (
              <label className="block">
                Property (optional — leave as "Whole account" for someone like the parent company's AP contact)
                <select name="propertyId" className="mt-1 w-full rounded border border-slate-300 px-2 py-1">
                  <option value="">Whole account</option>
                  {account.properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="mr-4 inline-flex items-center gap-1">
              <input type="checkbox" name="receivesInvoices" /> Gets invoices
            </label>
            <label className="inline-flex items-center gap-1">
              <input type="checkbox" name="receivesReminders" /> Gets payment reminders
            </label>
            <button type="submit" className="ml-4 rounded bg-slate-900 px-3 py-1 text-white">
              Add
            </button>
          </form>
        )}
        <ul className="space-y-1 text-sm">
          {account.contacts.map((c) => (
            <li key={c.id} className="rounded border border-slate-200 bg-white px-3 py-2">
              <span className="font-medium">{c.name}</span> ({c.role}) — {c.email || 'no email'}
              {c.property ? (
                <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{c.property.name}</span>
              ) : (
                <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">whole account</span>
              )}
              {c.receivesReminders && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">reminders</span>}
            </li>
          ))}
          {account.contacts.length === 0 && <li className="text-slate-400">No contacts yet.</li>}
        </ul>
      </section>

      {/* Jobs */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Jobs</h2>
          <button onClick={() => setShowJobForm((v) => !v)} className="text-sm text-blue-600">
            {showJobForm ? 'Cancel' : '+ Log job'}
          </button>
        </div>
        {showJobForm && (
          <form onSubmit={addJob} className="mb-3 flex gap-2 rounded border border-slate-200 bg-white p-3 text-sm">
            <input name="title" placeholder="Job title" required className="flex-1 rounded border border-slate-300 px-2 py-1" />
            <input name="description" placeholder="Description (optional)" className="flex-1 rounded border border-slate-300 px-2 py-1" />
            <button type="submit" className="rounded bg-slate-900 px-3 py-1 text-white">
              Add
            </button>
          </form>
        )}
        <ul className="space-y-1 text-sm">
          {account.jobs.map((j) => (
            <li key={j.id} className="rounded border border-slate-200 bg-white px-3 py-2">
              <Link to={`/jobs/${j.id}`} className="font-medium text-blue-600 hover:underline">
                {j.title}
              </Link>{' '}
              — {j.status} — {new Date(j.createdAt).toLocaleDateString()}
            </li>
          ))}
          {account.jobs.length === 0 && <li className="text-slate-400">No jobs logged yet.</li>}
        </ul>
      </section>

      {/* Quotes */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Quotes</h2>
          <Link to={`/quotes/new?accountId=${id}`} className="text-sm text-blue-600">
            + New quote
          </Link>
        </div>
        <ul className="space-y-1 text-sm">
          {account.quotes.map((q) => (
            <li key={q.id} className="rounded border border-slate-200 bg-white px-3 py-2">
              <Link to={`/quotes/${q.id}`} className="font-medium text-blue-600 hover:underline">
                {q.quoteNumber}
              </Link>{' '}
              — {money(q.amountCents)} — {q.status} — issued {new Date(q.issueDate).toLocaleDateString()}
            </li>
          ))}
          {account.quotes.length === 0 && <li className="text-slate-400">No quotes yet.</li>}
        </ul>
      </section>

      {/* Invoices */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Invoices</h2>
          <Link to={`/invoices/new?accountId=${id}`} className="text-sm text-blue-600">
            + New invoice
          </Link>
        </div>
        <ul className="space-y-1 text-sm">
          {account.invoices.map((inv) => (
            <li key={inv.id} className="rounded border border-slate-200 bg-white px-3 py-2">
              <Link to={`/invoices/${inv.id}`} className="font-medium text-blue-600 hover:underline">
                {inv.invoiceNumber}
              </Link>{' '}
              — {money(inv.amountCents)} — {inv.status} — due {new Date(inv.dueDate).toLocaleDateString()}
            </li>
          ))}
          {account.invoices.length === 0 && <li className="text-slate-400">No invoices yet.</li>}
        </ul>
      </section>

      {/* Payments */}
      <section>
        <h2 className="mb-2 text-lg font-semibold">Payments</h2>
        <ul className="space-y-1 text-sm">
          {account.payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded border border-slate-200 bg-white px-3 py-2">
              <span>
                <span className="font-medium">{money(p.amountCents)}</span> on {new Date(p.paidAt).toLocaleDateString()} —{' '}
                {p.invoices.map((i, idx) => (
                  <span key={i.id}>
                    <Link to={`/invoices/${i.id}`} className="text-blue-600 hover:underline">
                      {i.invoiceNumber}
                    </Link>
                    {idx < p.invoices.length - 1 ? ', ' : ''}
                  </span>
                ))}
                {p.notes && <span className="text-slate-500"> — {p.notes}</span>}
              </span>
              <button onClick={() => undoPayment(p.id)} className="shrink-0 text-xs text-red-600 hover:underline">
                Undo
              </button>
            </li>
          ))}
          {account.payments.length === 0 && <li className="text-slate-400">No payments recorded yet.</li>}
        </ul>
      </section>
    </div>
  );
}
