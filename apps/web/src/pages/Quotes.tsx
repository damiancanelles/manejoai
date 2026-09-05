import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

interface Quote {
  id: string;
  quoteNumber: string;
  amountCents: number;
  status: string;
  issueDate: string;
  account: { name: string };
}

const statuses = ['ALL', 'PENDING', 'APPROVED'];

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function Quotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status !== 'ALL') params.set('status', status);
    if (debouncedSearch) params.set('search', debouncedSearch);
    api
      .get<Quote[]>(`/quotes?${params.toString()}`)
      .then(setQuotes)
      .finally(() => setLoading(false));
  }, [status, debouncedSearch]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quotes</h1>
        <Link to="/quotes/new" className="rounded bg-slate-900 px-4 py-2 text-sm text-white">
          New quote
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded px-3 py-1 text-sm ${
                status === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search quote #, customer, property, notes..."
          className="ml-auto w-72 rounded border border-slate-300 px-3 py-1.5 text-sm"
        />
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2">Quote</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Issued</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">
                    <Link to={`/quotes/${q.id}`} className="text-blue-600 hover:underline">
                      {q.quoteNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{q.account.name}</td>
                  <td className="px-4 py-2">{money(q.amountCents)}</td>
                  <td className="px-4 py-2">{q.status}</td>
                  <td className="px-4 py-2">{new Date(q.issueDate).toLocaleDateString()}</td>
                </tr>
              ))}
              {quotes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-slate-400">
                    No quotes match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
