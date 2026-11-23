import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import Pagination from '../components/Pagination';
import { PAGE_SIZE, paginate } from '../lib/paginate';
import { downloadQuotePdfById } from '../lib/quotePdf';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';

interface Quote {
  id: string;
  quoteNumber: string;
  notes?: string | null;
  amountCents: number;
  status: string;
  issueDate: string;
  account: { name: string };
  property?: { name: string } | null;
}

const statuses = ['ALL', 'PENDING', 'APPROVED'];

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function Quotes() {
  const { t, locale } = useI18n();
  const { business } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function handleDownload(id: string) {
    if (!business || downloadingId) return;
    setDownloadingId(id);
    setDownloadError(null);
    try {
      await downloadQuotePdfById(id, business);
    } catch (err: any) {
      setDownloadError(err.message || 'Download failed');
    } finally {
      setDownloadingId(null);
    }
  }

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

      {downloadError && <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{downloadError}</div>}

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
                  <th className="px-4 py-2">{t('quotes.colProperty')}</th>
                  <th className="px-4 py-2">{t('quotes.colNotes')}</th>
                  <th className="px-4 py-2">{t('quotes.colAmount')}</th>
                  <th className="px-4 py-2">{t('quotes.colStatus')}</th>
                  <th className="px-4 py-2">{t('quotes.colIssued')}</th>
                  <th className="px-4 py-2"></th>
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
                    <td className="px-4 py-2">{q.property?.name ?? '—'}</td>
                    <td className="px-4 py-2">{q.notes || '—'}</td>
                    <td className="px-4 py-2">{money(q.amountCents)}</td>
                    <td className="px-4 py-2">{t(`status.${q.status}`)}</td>
                    <td className="px-4 py-2">{new Date(q.issueDate).toLocaleDateString(locale)}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleDownload(q.id)}
                        disabled={downloadingId === q.id}
                        aria-label={t('common.downloadPdf')}
                        title={t('common.downloadPdf')}
                        className="text-slate-400 hover:text-indigo-600 disabled:opacity-50"
                      >
                        {downloadingId === q.id ? (
                          <span className="text-xs">…</span>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16" />
                          </svg>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
                {quotes.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-4 text-slate-400">
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
