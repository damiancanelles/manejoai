import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import Pagination from '../components/Pagination';
import { PAGE_SIZE, paginate } from '../lib/paginate';
import { useI18n } from '../i18n';

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
  const { t, locale } = useI18n();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    const params = new URLSearchParams();
    if (status !== 'ALL') params.set('status', status);
    if (debouncedSearch) params.set('search', debouncedSearch);
    api
      .get<Quote[]>(`/quotes?${params.toString()}`)
      .then(setQuotes)
      .finally(() => setLoading(false));
  }, [status, debouncedSearch]);

  const pageQuotes = paginate(quotes, page);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('quotes.title')}</h1>
        <Link
          to="/quotes/new"
          className="rounded bg-indigo-600 px-4 py-2 text-sm text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          {t('quotes.new')}
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded px-3 py-1 text-sm transition-colors ${
                status === s ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s === 'ALL' ? t('status.ALL') : t(`status.${s}`)}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('quotes.search')}
          className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm sm:ml-auto sm:w-72"
        />
      </div>

      {loading ? (
        <p>{t('common.loading')}</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2">{t('quotes.colQuote')}</th>
                  <th className="px-4 py-2">{t('quotes.colCustomer')}</th>
                  <th className="px-4 py-2">{t('quotes.colAmount')}</th>
                  <th className="px-4 py-2">{t('quotes.colStatus')}</th>
                  <th className="px-4 py-2">{t('quotes.colIssued')}</th>
                </tr>
              </thead>
              <tbody>
                {pageQuotes.map((q) => (
                  <tr key={q.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">
                      <Link to={`/quotes/${q.id}`} className="text-indigo-600 hover:underline">
                        {q.quoteNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{q.account.name}</td>
                    <td className="px-4 py-2">{money(q.amountCents)}</td>
                    <td className="px-4 py-2">{t(`status.${q.status}`)}</td>
                    <td className="px-4 py-2">{new Date(q.issueDate).toLocaleDateString(locale)}</td>
                  </tr>
                ))}
                {quotes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-slate-400">
                      {t('quotes.empty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalItems={quotes.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </>
      )}
    </div>
  );
}
