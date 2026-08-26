import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';

interface Account {
  id: string;
  name: string;
  properties: { id: string; name: string }[];
  jobs: { id: string; title: string }[];
}

export default function InvoiceNew() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState(params.get('accountId') || '');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
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

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const amountDollars = Number(form.get('amount'));
    try {
      const invoice = await api.post<{ id: string }>('/invoices', {
        accountId,
        propertyId: (form.get('propertyId') as string) || undefined,
        jobId: (form.get('jobId') as string) || undefined,
        amountCents: Math.round(amountDollars * 100),
        dueDate: new Date(form.get('dueDate') as string).toISOString(),
        notes: (form.get('notes') as string) || undefined,
      });
      navigate(`/invoices/${invoice.id}`);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">New invoice</h1>
      {error && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <label className="block text-sm">
          Customer
          <select
            required
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          >
            <option value="">Select a customer...</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        {selectedAccount && selectedAccount.properties.length > 0 && (
          <label className="block text-sm">
            Property (optional)
            <select name="propertyId" className="mt-1 w-full rounded border border-slate-300 px-3 py-2">
              <option value="">None</option>
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
            Related job (optional)
            <select name="jobId" className="mt-1 w-full rounded border border-slate-300 px-3 py-2">
              <option value="">None</option>
              {selectedAccount.jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block text-sm">
          Amount (USD)
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          Due date
          <input
            name="dueDate"
            type="date"
            required
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          Notes (optional)
          <textarea name="notes" className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
        </label>

        <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm text-white">
          Create invoice
        </button>
      </form>
    </div>
  );
}
