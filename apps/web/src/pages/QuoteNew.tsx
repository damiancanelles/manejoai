import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useT } from '../i18n';

interface Account {
  id: string;
  name: string;
  properties: { id: string; name: string }[];
  jobs: { id: string; title: string }[];
}
interface ItemRow {
  description: string;
  quantity: string;
  unitPrice: string;
}

function emptyRow(): ItemRow {
  return { description: '', quantity: '1', unitPrice: '' };
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function QuoteNew() {
  const t = useT();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState(params.get('accountId') || '');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [items, setItems] = useState<ItemRow[]>([emptyRow()]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Account[]>('/accounts').then(setAccounts);
  }, []);

  useEffect(() => {
    if (!accountId) {
      setSelectedAccount(null);
      return;
    }
    api.get<Account>(`/accounts/${accountId}`).then(setSelectedAccount);
  }, [accountId]);

  function updateItem(index: number, field: keyof ItemRow, value: string) {
    setItems((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    setItems((rows) => [...rows, emptyRow()]);
  }

  function removeRow(index: number) {
    setItems((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== index) : rows));
  }

  const totalCents = items.reduce((sum, row) => {
    const qty = Number(row.quantity) || 0;
    const price = Number(row.unitPrice) || 0;
    return sum + Math.round(qty * price * 100);
  }, 0);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);

    const parsedItems = items.map((row) => ({
      description: row.description.trim(),
      quantity: Number(row.quantity),
      unitPriceCents: Math.round((Number(row.unitPrice) || 0) * 100),
    }));
    if (parsedItems.some((it) => !it.description)) {
      setError(t('lineItems.errDescription'));
      return;
    }
    if (parsedItems.some((it) => !it.quantity || it.quantity < 1)) {
      setError(t('lineItems.errQuantity'));
      return;
    }

    try {
      const quote = await api.post<{ id: string }>('/quotes', {
        accountId,
        propertyId: (form.get('propertyId') as string) || undefined,
        jobId: (form.get('jobId') as string) || undefined,
        items: parsedItems,
        notes: (form.get('notes') as string) || undefined,
      });
      navigate(`/quotes/${quote.id}`);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">{t('quoteNew.title')}</h1>
      {error && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block text-sm">
          {t('quoteNew.customer')}
          <select
            required
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          >
            <option value="">{t('quoteNew.selectCustomer')}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        {selectedAccount && selectedAccount.properties.length > 0 && (
          <label className="block text-sm">
            {t('quoteNew.property')}
            <select name="propertyId" className="mt-1 w-full rounded border border-slate-300 px-3 py-2">
              <option value="">{t('common.none')}</option>
              {selectedAccount.properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {selectedAccount && selectedAccount.jobs.length > 0 && (
          <label className="block text-sm">
            {t('quoteNew.relatedJob')}
            <select name="jobId" className="mt-1 w-full rounded border border-slate-300 px-3 py-2">
              <option value="">{t('common.none')}</option>
              {selectedAccount.jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="text-sm">
          <div className="mb-1 flex items-center justify-between">
            <span>{t('lineItems.items')}</span>
            <button type="button" onClick={addRow} className="text-indigo-600">
              {t('lineItems.addItem')}
            </button>
          </div>
          <div className="overflow-x-auto rounded border border-slate-200">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="bg-slate-100 text-left text-slate-500">
                <tr>
                  <th className="px-2 py-1.5">{t('lineItems.colDescription')}</th>
                  <th className="w-20 px-2 py-1.5">{t('lineItems.colQty')}</th>
                  <th className="w-28 px-2 py-1.5">{t('lineItems.colUnitPrice')}</th>
                  <th className="w-28 px-2 py-1.5 text-right">{t('lineItems.colLineTotal')}</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, i) => {
                  const lineCents = Math.round((Number(row.quantity) || 0) * (Number(row.unitPrice) || 0) * 100);
                  return (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-2 py-1">
                        <input
                          value={row.description}
                          onChange={(e) => updateItem(i, 'description', e.target.value)}
                          placeholder={t('lineItems.itemPlaceholder')}
                          required
                          className="w-full rounded border border-slate-300 px-2 py-1"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={row.quantity}
                          onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                          required
                          className="w-full rounded border border-slate-300 px-2 py-1"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.unitPrice}
                          onChange={(e) => updateItem(i, 'unitPrice', e.target.value)}
                          placeholder="0.00"
                          required
                          className="w-full rounded border border-slate-300 px-2 py-1"
                        />
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums text-slate-600">{money(lineCents)}</td>
                      <td className="px-2 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(i)}
                          disabled={items.length === 1}
                          className="text-slate-400 hover:text-red-600 disabled:opacity-30"
                          aria-label={t('lineItems.removeItem')}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                  <td colSpan={3} className="px-2 py-1.5 text-right">
                    {t('lineItems.total')}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{money(totalCents)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <label className="block text-sm">
          {t('quoteNew.notes')}
          <textarea name="notes" className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
        </label>

        <button
          type="submit"
          className="rounded bg-indigo-600 px-4 py-2 text-sm text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          {t('quoteNew.submit')}
        </button>
      </form>
    </div>
  );
}
