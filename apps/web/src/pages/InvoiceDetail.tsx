import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';

interface Reminder {
  id: string;
  sentAt: string;
  toEmail: string;
}
interface Invoice {
  id: string;
  invoiceNumber: string;
  amountCents: number;
  status: string;
  issueDate: string;
  dueDate: string;
  notes?: string;
  account: { id: string; name: string };
  property?: { name: string } | null;
  job?: { title: string } | null;
  reminders: Reminder[];
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);

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

  if (!invoice) return <p>Loading...</p>;

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{invoice.invoiceNumber}</h1>
          <Link to={`/accounts/${invoice.account.id}`} className="text-sm text-blue-600 hover:underline">
            {invoice.account.name}
          </Link>
          {invoice.property && <span className="text-sm text-slate-500"> — {invoice.property.name}</span>}
        </div>
        <span className="rounded bg-slate-100 px-2 py-1 text-sm font-medium">{invoice.status}</span>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <div className="mb-2 flex justify-between">
          <span className="text-slate-500">Amount</span>
          <span className="font-semibold">{money(invoice.amountCents)}</span>
        </div>
        <div className="mb-2 flex justify-between">
          <span className="text-slate-500">Issued</span>
          <span>{new Date(invoice.issueDate).toLocaleDateString()}</span>
        </div>
        <div className="mb-2 flex justify-between">
          <span className="text-slate-500">Due</span>
          <span>{new Date(invoice.dueDate).toLocaleDateString()}</span>
        </div>
        {invoice.job && (
          <div className="mb-2 flex justify-between">
            <span className="text-slate-500">Job</span>
            <span>{invoice.job.title}</span>
          </div>
        )}
        {invoice.notes && <p className="mt-2 border-t border-slate-100 pt-2 text-slate-600">{invoice.notes}</p>}
      </div>

      <div className="flex gap-2">
        {invoice.status === 'DRAFT' && (
          <button onClick={() => action('mark-sent')} className="rounded bg-slate-900 px-4 py-2 text-sm text-white">
            Mark as sent
          </button>
        )}
        {invoice.status !== 'PAID' && invoice.status !== 'CANCELED' && (
          <>
            <button onClick={() => action('mark-paid')} className="rounded bg-green-600 px-4 py-2 text-sm text-white">
              Mark as paid
            </button>
            <button onClick={() => action('cancel')} className="rounded bg-slate-200 px-4 py-2 text-sm text-slate-700">
              Cancel
            </button>
          </>
        )}
      </div>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Reminder history</h2>
        <ul className="space-y-1 text-sm">
          {invoice.reminders.map((r) => (
            <li key={r.id} className="rounded border border-slate-200 bg-white px-3 py-2">
              Sent to {r.toEmail} on {new Date(r.sentAt).toLocaleString()}
            </li>
          ))}
          {invoice.reminders.length === 0 && <li className="text-slate-400">No reminders sent yet.</li>}
        </ul>
      </section>
    </div>
  );
}
