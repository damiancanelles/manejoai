import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
}
interface Quote {
  id: string;
  quoteNumber: string;
  amountCents: number;
  status: string;
  issueDate: string;
  notes?: string;
  approvedAt?: string | null;
  account: { id: string; name: string };
  property?: { name: string } | null;
  job?: { title: string } | null;
  invoice?: { id: string; invoiceNumber: string } | null;
  items: QuoteItem[];
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

  function load() {
    if (!id) return;
    api.get<Quote>(`/quotes/${id}`).then(setQuote);
  }

  useEffect(load, [id]);

  const locked = quote?.status === 'APPROVED';

  async function addItem(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id) return;
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await api.post(`/quotes/${id}/items`, {
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
      await api.patch(`/quotes/${id}/items/${itemId}`, {
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

  async function removeItem(itemId: string) {
    if (!id) return;
    setError(null);
    try {
      await api.delete(`/quotes/${id}/items/${itemId}`);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function approve() {
    if (!id) return;
    setError(null);
    setApproving(true);
    try {
      await api.post(`/quotes/${id}/approve`);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setApproving(false);
    }
  }

  async function removeQuote() {
    if (!id) return;
    setError(null);
    try {
      await api.delete(`/quotes/${id}`);
      navigate('/quotes');
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (!quote) return <p>Loading...</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{quote.quoteNumber}</h1>
          <Link to={`/accounts/${quote.account.id}`} className="text-sm text-blue-600 hover:underline">
            {quote.account.name}
          </Link>
          {quote.property && <span className="text-sm text-slate-500"> — {quote.property.name}</span>}
        </div>
        <span
          className={`rounded px-2 py-1 text-sm font-medium ${
            locked ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
          }`}
        >
          {quote.status}
        </span>
      </div>

      {error && <div className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}

      {locked && quote.invoice && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Approved {quote.approvedAt && `on ${new Date(quote.approvedAt).toLocaleDateString()}`} — converted to{' '}
          <Link to={`/invoices/${quote.invoice.id}`} className="font-medium underline">
            invoice {quote.invoice.invoiceNumber}
          </Link>
          .
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <div className="mb-2 flex justify-between">
          <span className="text-slate-500">Issued</span>
          <span>{new Date(quote.issueDate).toLocaleDateString()}</span>
        </div>
        {quote.job && (
          <div className="mb-2 flex justify-between">
            <span className="text-slate-500">Job</span>
            <span>{quote.job.title}</span>
          </div>
        )}
        {quote.notes && <p className="mt-2 border-t border-slate-100 pt-2 text-slate-600">{quote.notes}</p>}
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Items</h2>
          {!locked && (
            <button onClick={() => setShowAddItem((v) => !v)} className="text-sm text-blue-600">
              {showAddItem ? 'Cancel' : '+ Add item'}
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="bg-slate-100 text-left text-slate-500">
              <tr>
                <th className="px-3 py-2">Description</th>
                <th className="w-16 px-3 py-2">Qty</th>
                <th className="w-24 px-3 py-2">Unit price</th>
                <th className="w-24 px-3 py-2 text-right">Line total</th>
                {!locked && <th className="w-16 px-3 py-2"></th>}
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item) =>
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
                        <button type="submit" className="rounded bg-slate-900 px-3 py-1 text-white">
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingItemId(null)}
                          className="rounded border border-slate-300 px-3 py-1"
                        >
                          Cancel
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
                          Edit
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          disabled={quote.items.length === 1}
                          className="text-slate-400 hover:text-red-600 disabled:opacity-30"
                        >
                          Remove
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
                        placeholder="Description"
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
                      <button type="submit" className="rounded bg-slate-900 px-3 py-1 text-white">
                        Add
                      </button>
                    </form>
                  </td>
                </tr>
              </tbody>
            )}
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                <td colSpan={3} className="px-3 py-2 text-right">
                  Total
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{money(quote.amountCents)}</td>
                {!locked && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {!locked && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={approve}
            disabled={approving}
            className="rounded bg-green-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {approving ? 'Approving...' : 'Approve → create invoice'}
          </button>
          <button onClick={removeQuote} className="rounded bg-slate-200 px-4 py-2 text-sm text-slate-700">
            Delete quote
          </button>
        </div>
      )}
    </div>
  );
}
