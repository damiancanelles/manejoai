import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';

interface Account {
  id: string;
  name: string;
  properties: { id: string; name: string }[];
}

export default function JobNew() {
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
    const scheduledAt = form.get('scheduledAt') as string;
    try {
      const job = await api.post<{ id: string }>('/jobs', {
        accountId,
        propertyId: (form.get('propertyId') as string) || undefined,
        title: form.get('title'),
        description: (form.get('description') as string) || undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      });
      navigate(`/jobs/${job.id}`);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">Log job</h1>
      {error && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
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

        <label className="block text-sm">
          Title
          <input
            name="title"
            type="text"
            required
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          Description (optional)
          <textarea name="description" className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
        </label>

        <label className="block text-sm">
          Scheduled for (optional)
          <input
            name="scheduledAt"
            type="date"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>

        <button
          type="submit"
          className="rounded bg-indigo-600 px-4 py-2 text-sm text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          Log job
        </button>
      </form>
    </div>
  );
}
