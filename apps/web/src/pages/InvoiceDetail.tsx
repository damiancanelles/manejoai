import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { downloadInvoicePdf } from '../lib/invoicePdf';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';

interface Reminder {
  id: string;
  sentAt: string;
  toEmail: string;
}
interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
}
interface Invoice {
  id: string;
  invoiceNumber: string;
  amountCents: number;
  status: string;
  issueDate: string;
  dueDate: string;
  title: string;
  account: { id: string; name: string };
  property?: {
    name: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    zip: string;
  } | null;
  job?: { title: string } | null;
  items: InvoiceItem[];
  reminders: Reminder[];
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const { business } = useAuth();
  const { t, locale } = useI18n();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);

  function load() {
    if (!id) return;
    api.get<Invoice>(`/invoices/${id}`).then(setInvoice);
  }

  useEffect(load, [id]);

  async function action(path: string) {
    if (!id) return;
    await api.post(`/invoices/${id}/${path}`);
    load();
  }

  const locked = invoice?.status === 'PAID' || invoice?.status === 'CANCELED';

  async function addItem(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id) return;
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await api.post(`/invoices/${id}/items`, {
        description: form.get('description'),
        quantity: Number(form.get('quantity')),
        unitPriceCents: Math.round(Number(form.get('unitPrice') || 0) * 100),
      });
      setShowAddItem(false);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function saveItem(e: FormEvent<HTMLFormElement>, itemId: string) {
    e.preventDefault();
    if (!id) return;
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await api.patch(`/invoices/${id}/items/${itemId}`, {
        description: form.get('description'),
        quantity: Number(form.get('quantity')),
        unitPriceCents: Math.round(Number(form.get('unitPrice') || 0) * 100),
      });
      setEditingItemId(null);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function saveTitle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id) return;
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await api.patch(`/invoices/${id}`, { title: form.get('title') });
      setEditingTitle(false);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function removeItem(itemId: string) {
    if (!id) return;
    setError(null);
    try {
      await api.delete(`/invoices/${id}/items/${itemId}`);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (!invoice) return <p>{t('common.loading')}</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{invoice.invoiceNumber}</h1>
          <Link to={`/accounts/${invoice.account.id}`} className="text-sm text-indigo-600 hover:underline">
            {invoice.account.name}
          </Link>
          {invoice.property && <span className="text-sm text-slate-500"> — {invoice.property.name}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => business && downloadInvoicePdf(invoice, business)}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            {t('invoiceDetail.downloadPdf')}
          </button>
          <span className="rounded bg-slate-100 px-2 py-1 text-sm font-medium">{t(`status.${invoice.status}`)}</span>
        </div>
      </div>

      {error && <div className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}

      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm">
        <div className="mb-2 flex justify-between">
          <span className="text-slate-500">{t('invoiceDetail.issued')}</span>
          <span>{new Date(invoice.issueDate).toLocaleDateString(locale)}</span>
        </div>
        <div className="mb-2 flex justify-between">
          <span className="text-slate-500">{t('invoiceDetail.due')}</span>
          <span>{new Date(invoice.dueDate).toLocaleDateString(locale)}</span>
        </div>
        {invoice.job && (
          <div className="mb-2 flex justify-between">
            <span className="text-slate-500">{t('invoiceDetail.job')}</span>
            <span>{invoice.job.title}</span>
          </div>
        )}
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
          <span className="shrink-0 text-slate-500">{t('invoiceDetail.titleLabel')}</span>
          {editingTitle ? (
            <form onSubmit={saveTitle} className="flex flex-1 items-center gap-2">
              <input
                name="title"
                defaultValue={invoice.title}
                required
                autoFocus
                className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1"
              />
              <button type="submit" className="shrink-0 text-indigo-600 hover:underline">
                {t('common.save')}
              </button>
              <button
                type="button"
                onClick={() => setEditingTitle(false)}
                className="shrink-0 text-slate-500 hover:underline"
              >
                {t('common.cancel')}
              </button>
            </form>
          ) : (
            <span className="text-right">
              {invoice.title}
              {invoice.status === 'DRAFT' && (
                <button onClick={() => setEditingTitle(true)} className="ml-2 text-indigo-600 hover:underline">
                  {t('common.edit')}
                </button>
              )}
            </span>
          )}
        </div>
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('invoiceDetail.items')}</h2>
          {!locked && (
            <button onClick={() => setShowAddItem((v) => !v)} className="text-sm text-indigo-600">
              {showAddItem ? t('common.cancel') : t('invoiceDetail.addItem')}
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="bg-slate-100 text-left text-slate-500">
              <tr>
                <th className="px-3 py-2">{t('lineItems.colDescription')}</th>
                <th className="w-16 px-3 py-2">{t('lineItems.colQty')}</th>
                <th className="w-24 px-3 py-2">{t('lineItems.colUnitPrice')}</th>
                <th className="w-24 px-3 py-2 text-right">{t('lineItems.colLineTotal')}</th>
                {!locked && <th className="w-16 px-3 py-2"></th>}
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) =>
                editingItemId === item.id ? (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td colSpan={locked ? 4 : 5} className="px-3 py-2">
                      <form onSubmit={(e) => saveItem(e, item.id)} className="flex flex-wrap items-center gap-2">
                        <input
                          name="description"
                          defaultValue={item.description}
                          required
                          className="min-w-[10rem] flex-1 rounded border border-slate-300 px-2 py-1"
                        />
                        <input
                          name="quantity"
                          type="number"
                          min="1"
                          step="1"
                          defaultValue={item.quantity}
                          required
                          className="w-16 rounded border border-slate-300 px-2 py-1"
                        />
                        <input
                          name="unitPrice"
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={(item.unitPriceCents / 100).toFixed(2)}
                          required
                          className="w-24 rounded border border-slate-300 px-2 py-1"
                        />
                        <button type="submit" className="rounded bg-indigo-600 hover:bg-indigo-700 transition-colors px-3 py-1 text-white">
                          {t('common.save')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingItemId(null)}
                          className="rounded border border-slate-300 px-3 py-1"
                        >
                          {t('common.cancel')}
                        </button>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{item.description}</td>
                    <td className="px-3 py-2 tabular-nums">{item.quantity}</td>
                    <td className="px-3 py-2 tabular-nums">{money(item.unitPriceCents)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(item.quantity * item.unitPriceCents)}</td>
                    {!locked && (
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => setEditingItemId(item.id)} className="mr-2 text-slate-500 hover:text-slate-900">
                          {t('common.edit')}
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          disabled={invoice.items.length === 1}
                          className="text-slate-400 hover:text-red-600 disabled:opacity-30"
                        >
                          {t('common.remove')}
                        </button>
                      </td>
                    )}
                  </tr>
                ),
              )}
            </tbody>
            {showAddItem && (
              <tbody>
                <tr className="border-t border-slate-200 bg-slate-50">
                  <td colSpan={5} className="px-3 py-2">
                    <form onSubmit={addItem} className="flex flex-wrap items-center gap-2">
                      <input
                        name="description"
                        placeholder={t('lineItems.descriptionPlaceholder')}
                        required
                        className="min-w-[10rem] flex-1 rounded border border-slate-300 px-2 py-1"
                      />
                      <input
                        name="quantity"
                        type="number"
                        min="1"
                        step="1"
                        defaultValue="1"
                        required
                        className="w-16 rounded border border-slate-300 px-2 py-1"
                      />
                      <input
                        name="unitPrice"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        required
                        className="w-24 rounded border border-slate-300 px-2 py-1"
                      />
                      <button type="submit" className="rounded bg-indigo-600 hover:bg-indigo-700 transition-colors px-3 py-1 text-white">
                        {t('common.add')}
                      </button>
                    </form>
                  </td>
                </tr>
              </tbody>
            )}
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                <td colSpan={3} className="px-3 py-2 text-right">
                  {t('lineItems.total')}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{money(invoice.amountCents)}</td>
                {!locked && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {invoice.status === 'DRAFT' && (
          <button onClick={() => action('mark-sent')} className="rounded bg-indigo-600 hover:bg-indigo-700 transition-colors px-4 py-2 text-sm text-white">
            {t('invoiceDetail.markSent')}
          </button>
        )}
        {!locked && (
          <>
            <button onClick={() => action('mark-paid')} className="rounded bg-green-600 px-4 py-2 text-sm text-white">
              {t('invoiceDetail.markPaid')}
            </button>
            <button onClick={() => action('cancel')} className="rounded bg-slate-200 px-4 py-2 text-sm text-slate-700">
              {t('invoiceDetail.cancelInvoice')}
            </button>
          </>
        )}
      </div>

      <section>
        <h2 className="mb-2 text-lg font-semibold">{t('invoiceDetail.reminderHistory')}</h2>
        <ul className="space-y-1 text-sm">
          {invoice.reminders.map((r) => (
            <li key={r.id} className="rounded border border-slate-200 bg-white px-3 py-2 shadow-sm">
              {t('invoiceDetail.reminderSent', { email: r.toEmail, date: new Date(r.sentAt).toLocaleString(locale) })}
            </li>
          ))}
          {invoice.reminders.length === 0 && <li className="text-slate-400">{t('invoiceDetail.noReminders')}</li>}
        </ul>
      </section>
    </div>
  );
}
