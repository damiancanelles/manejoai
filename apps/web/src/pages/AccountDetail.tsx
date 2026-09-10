import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useI18n } from '../i18n';
import StatTile from '../components/StatTile';
import MonthlyIncomeChart from '../components/MonthlyIncomeChart';
import RankedTable from '../components/RankedTable';
import YearSwitcher from '../components/YearSwitcher';
import {
  sumByStatus,
  monthlyIncome,
  incomeByProperty,
  paidByProperty,
  overdueByProperty,
  yearsWithInvoices,
  money,
} from '../lib/invoiceStats';

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
  const { t, locale } = useI18n();
  const { id } = useParams<{ id: string }>();
  const [account, setAccount] = useState<Account | null>(null);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderResult, setReminderResult] = useState<ReminderResult | null>(null);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [yearInitialized, setYearInitialized] = useState(false);

  function load() {
    if (!id) return;
    api.get<Account>(`/accounts/${id}`).then(setAccount);
  }

  useEffect(load, [id]);

  // Default to the most recent year with data, but only once - later
  // reloads (after adding a job/contact/etc) shouldn't reset the switcher
  // if the user already picked a year.
  useEffect(() => {
    if (yearInitialized || !account) return;
    const years = yearsWithInvoices(account.invoices);
    if (years.length > 0) setYear(years[0]);
    setYearInitialized(true);
  }, [account, yearInitialized]);

  if (!account) return <p>{t('common.loading')}</p>;

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
    if (!confirm(t('accountDetail.reminderConfirm'))) {
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
    if (!confirm(t('accountDetail.undoPaymentConfirm'))) {
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

  const years = yearsWithInvoices(account.invoices);
  const yearLabel = year != null ? `${year}` : t('dashboard.allTime');
  const paidTotal = sumByStatus(account.invoices, 'PAID', year);
  const overdueTotal = sumByStatus(account.invoices, 'OVERDUE', year);
  const monthly = monthlyIncome(account.invoices, year, locale);
  const propertyNames = new Map(account.properties.map((p) => [p.id, p.name]));
  const byProperty = incomeByProperty(account.invoices, propertyNames, year);
  const paidByProp = paidByProperty(account.invoices, propertyNames, year);
  const overdueByProp = overdueByProperty(account.invoices, propertyNames, year);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{account.name}</h1>
          <p className="text-sm text-slate-500">
            {account.type === 'MULTIFAMILY' ? t('accountType.MULTIFAMILY_LONG') : t('accountType.INDIVIDUAL_LONG')}
          </p>
        </div>
        <button
          onClick={sendPaymentReminder}
          disabled={sendingReminder}
          className="shrink-0 rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          {sendingReminder ? t('accountDetail.sending') : t('accountDetail.sendReminder')}
        </button>
      </div>

      {reminderError && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{reminderError}</div>}

      {reminderResult && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          {reminderResult.emailsSent > 0 ? (
            <p>
              {t('accountDetail.reminderSent', {
                emails: reminderResult.emailsSent,
                invoices: reminderResult.invoicesIncluded,
              })}
            </p>
          ) : (
            <p>{t('accountDetail.reminderNone')}</p>
          )}
          {reminderResult.skipped.length > 0 && (
            <div className="mt-2 border-t border-green-200 pt-2 text-amber-800">
              <p className="font-medium">{t('accountDetail.reminderSkipped')}</p>
              <ul className="mt-1 list-disc pl-5">
                {reminderResult.skipped.map((s, i) => (
                  <li key={i}>
                    {s.property || t('common.wholeAccount')}: {s.invoiceNumbers.join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Financials */}
      <section>
        <div className="mb-3 flex justify-end">
          <YearSwitcher years={years} selected={year} onChange={setYear} />
        </div>
        <div className="mb-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatTile label={t('accountDetail.paid', { year: yearLabel })} value={money(paidTotal)} tone="green" />
          <StatTile label={t('accountDetail.overdue', { year: yearLabel })} value={money(overdueTotal)} tone="red" />
        </div>
        <h2 className="mb-2 text-lg font-semibold">{t('accountDetail.byMonth')}</h2>
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <MonthlyIncomeChart data={monthly} />
        </div>
        {account.properties.length > 0 && (
          <>
            <h2 className="mb-2 text-lg font-semibold">{t('accountDetail.byProperty')}</h2>
            <RankedTable rows={byProperty} emptyLabel={t('accountDetail.noInvoices')} />

            <h2 className="mb-2 mt-4 text-lg font-semibold">{t('accountDetail.paidByProperty')}</h2>
            <RankedTable rows={paidByProp} emptyLabel={t('accountDetail.noPaidInvoices')} />

            <h2 className="mb-2 mt-4 text-lg font-semibold">{t('accountDetail.overdueByProperty')}</h2>
            <RankedTable rows={overdueByProp} emptyLabel={t('accountDetail.noOverdueInvoices')} />
          </>
        )}
      </section>

      {/* Properties */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('accountDetail.properties')}</h2>
          <button onClick={() => setShowPropertyForm((v) => !v)} className="text-sm text-indigo-600">
            {showPropertyForm ? t('common.cancel') : t('accountDetail.addProperty')}
          </button>
        </div>
        {showPropertyForm && (
          <form onSubmit={addProperty} className="mb-3 grid grid-cols-1 gap-2 rounded border border-slate-200 bg-white p-3 shadow-sm text-sm sm:grid-cols-2 lg:grid-cols-5">
            <input name="name" placeholder={t('accountDetail.propertyName')} required className="rounded border border-slate-300 px-2 py-1" />
            <input name="addressLine1" placeholder={t('accountDetail.address')} required className="rounded border border-slate-300 px-2 py-1" />
            <input name="city" placeholder={t('accountDetail.city')} required className="rounded border border-slate-300 px-2 py-1" />
            <input name="state" placeholder={t('accountDetail.state')} required className="rounded border border-slate-300 px-2 py-1" />
            <div className="flex gap-1">
              <input name="zip" placeholder={t('accountDetail.zip')} required className="w-full rounded border border-slate-300 px-2 py-1" />
              <button type="submit" className="rounded bg-indigo-600 hover:bg-indigo-700 transition-colors px-3 text-white">
                {t('common.add')}
              </button>
            </div>
          </form>
        )}
        <ul className="space-y-1 text-sm">
          {account.properties.map((p) => (
            <li key={p.id} className="rounded border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <span className="font-medium">{p.name}</span> — {p.addressLine1}, {p.city}, {p.state} {p.zip}
            </li>
          ))}
          {account.properties.length === 0 && <li className="text-slate-400">{t('accountDetail.noProperties')}</li>}
        </ul>
      </section>

      {/* Contacts */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('accountDetail.contacts')}</h2>
          <button onClick={() => setShowContactForm((v) => !v)} className="text-sm text-indigo-600">
            {showContactForm ? t('common.cancel') : t('accountDetail.addContact')}
          </button>
        </div>
        {showContactForm && (
          <form onSubmit={addContact} className="mb-3 space-y-2 rounded border border-slate-200 bg-white p-3 shadow-sm text-sm">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <select name="role" className="rounded border border-slate-300 px-2 py-1">
                <option value="OWNER">{t('contactRole.OWNER')}</option>
                <option value="SALES">{t('contactRole.SALES')}</option>
                <option value="INVOICING">{t('contactRole.INVOICING')}</option>
                <option value="GENERAL">{t('contactRole.GENERAL')}</option>
              </select>
              <input name="name" placeholder={t('accountDetail.name')} required className="rounded border border-slate-300 px-2 py-1" />
              <input name="email" placeholder={t('accountDetail.email')} type="email" className="rounded border border-slate-300 px-2 py-1" />
              <input name="phone" placeholder={t('accountDetail.phone')} className="rounded border border-slate-300 px-2 py-1" />
            </div>
            {account.properties.length > 0 && (
              <label className="block">
                {t('accountDetail.contactPropertyHint')}
                <select name="propertyId" className="mt-1 w-full rounded border border-slate-300 px-2 py-1">
                  <option value="">{t('common.wholeAccount')}</option>
                  {account.properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="mr-4 inline-flex items-center gap-1">
              <input type="checkbox" name="receivesInvoices" /> {t('accountDetail.getsInvoices')}
            </label>
            <label className="inline-flex items-center gap-1">
              <input type="checkbox" name="receivesReminders" /> {t('accountDetail.getsReminders')}
            </label>
            <button type="submit" className="ml-4 rounded bg-indigo-600 hover:bg-indigo-700 transition-colors px-3 py-1 text-white">
              {t('common.add')}
            </button>
          </form>
        )}
        <ul className="space-y-1 text-sm">
          {account.contacts.map((c) => (
            <li key={c.id} className="rounded border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <span className="font-medium">{c.name}</span> ({t(`contactRole.${c.role}`)}) — {c.email || t('common.noEmail')}
              {c.property ? (
                <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{c.property.name}</span>
              ) : (
                <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{t('common.wholeAccountLower')}</span>
              )}
              {c.receivesReminders && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">{t('accountDetail.remindersBadge')}</span>}
            </li>
          ))}
          {account.contacts.length === 0 && <li className="text-slate-400">{t('accountDetail.noContacts')}</li>}
        </ul>
      </section>

      {/* Jobs */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('accountDetail.jobs')}</h2>
          <button onClick={() => setShowJobForm((v) => !v)} className="text-sm text-indigo-600">
            {showJobForm ? t('common.cancel') : t('accountDetail.logJob')}
          </button>
        </div>
        {showJobForm && (
          <form onSubmit={addJob} className="mb-3 flex flex-wrap gap-2 rounded border border-slate-200 bg-white p-3 shadow-sm text-sm">
            <input name="title" placeholder={t('accountDetail.jobTitlePlaceholder')} required className="min-w-[10rem] flex-1 rounded border border-slate-300 px-2 py-1" />
            <input name="description" placeholder={t('accountDetail.jobDescPlaceholder')} className="min-w-[10rem] flex-1 rounded border border-slate-300 px-2 py-1" />
            <button type="submit" className="rounded bg-indigo-600 hover:bg-indigo-700 transition-colors px-3 py-1 text-white">
              {t('common.add')}
            </button>
          </form>
        )}
        <ul className="space-y-1 text-sm">
          {account.jobs.map((j) => (
            <li key={j.id} className="rounded border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <Link to={`/jobs/${j.id}`} className="font-medium text-indigo-600 hover:underline">
                {j.title}
              </Link>{' '}
              — {t(`status.${j.status}`)} — {new Date(j.createdAt).toLocaleDateString(locale)}
            </li>
          ))}
          {account.jobs.length === 0 && <li className="text-slate-400">{t('accountDetail.noJobs')}</li>}
        </ul>
      </section>

      {/* Quotes */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('accountDetail.quotes')}</h2>
          <Link to={`/quotes/new?accountId=${id}`} className="text-sm text-indigo-600">
            {t('accountDetail.newQuote')}
          </Link>
        </div>
        <ul className="space-y-1 text-sm">
          {account.quotes.map((q) => (
            <li key={q.id} className="rounded border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <Link to={`/quotes/${q.id}`} className="font-medium text-indigo-600 hover:underline">
                {q.quoteNumber}
              </Link>{' '}
              — {money(q.amountCents)} — {t(`status.${q.status}`)} —{' '}
              {t('accountDetail.issuedOn', { date: new Date(q.issueDate).toLocaleDateString(locale) })}
            </li>
          ))}
          {account.quotes.length === 0 && <li className="text-slate-400">{t('accountDetail.noQuotes')}</li>}
        </ul>
      </section>

      {/* Invoices */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('accountDetail.invoices')}</h2>
          <Link to={`/invoices/new?accountId=${id}`} className="text-sm text-indigo-600">
            {t('accountDetail.newInvoice')}
          </Link>
        </div>
        <ul className="space-y-1 text-sm">
          {account.invoices.map((inv) => (
            <li key={inv.id} className="rounded border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <Link to={`/invoices/${inv.id}`} className="font-medium text-indigo-600 hover:underline">
                {inv.invoiceNumber}
              </Link>{' '}
              — {money(inv.amountCents)} — {t(`status.${inv.status}`)} —{' '}
              {t('accountDetail.dueOn', { date: new Date(inv.dueDate).toLocaleDateString(locale) })}
            </li>
          ))}
          {account.invoices.length === 0 && <li className="text-slate-400">{t('accountDetail.noInvoices')}</li>}
        </ul>
      </section>

      {/* Payments */}
      <section>
        <h2 className="mb-2 text-lg font-semibold">{t('accountDetail.payments')}</h2>
        <ul className="space-y-1 text-sm">
          {account.payments.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <span>
                <span className="font-medium">
                  {t('accountDetail.paymentOn', { amount: money(p.amountCents), date: new Date(p.paidAt).toLocaleDateString(locale) })}
                </span>{' '}
                —{' '}
                {p.invoices.map((i, idx) => (
                  <span key={i.id}>
                    <Link to={`/invoices/${i.id}`} className="text-indigo-600 hover:underline">
                      {i.invoiceNumber}
                    </Link>
                    {idx < p.invoices.length - 1 ? ', ' : ''}
                  </span>
                ))}
                {p.notes && <span className="text-slate-500"> — {p.notes}</span>}
              </span>
              <button onClick={() => undoPayment(p.id)} className="shrink-0 text-xs text-red-600 hover:underline">
                {t('common.undo')}
              </button>
            </li>
          ))}
          {account.payments.length === 0 && <li className="text-slate-400">{t('accountDetail.noPayments')}</li>}
        </ul>
      </section>
    </div>
  );
}
