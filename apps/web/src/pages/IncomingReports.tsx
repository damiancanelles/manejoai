import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

interface Account {
  id: string;
  name: string;
  properties: { id: string; name: string }[];
}

interface IncomingReport {
  id: string;
  senderName: string | null;
  rawText: string | null;
  photoUrls: string[];
  suggestedTitle: string | null;
  suggestedDescription: string | null;
  suggestedPropertyText: string | null;
  matchedPropertyId: string | null;
  matchedProperty: { id: string; name: string; account: { id: string; name: string } } | null;
  status: 'PENDING' | 'CONVERTED' | 'DISMISSED';
  jobId: string | null;
  receivedAt: string;
}

const statuses = ['PENDING', 'CONVERTED', 'DISMISSED', 'ALL'];

export default function IncomingReports() {
  const [reports, setReports] = useState<IncomingReport[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [status, setStatus] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (status !== 'ALL') params.set('status', status);
    if (debouncedSearch) params.set('search', debouncedSearch);
    Promise.all([
      api.get<IncomingReport[]>(`/incoming-reports?${params.toString()}`),
      api.get<Account[]>('/accounts'),
    ])
      .then(([r, a]) => {
        setReports(r);
        setAccounts(a);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [status, debouncedSearch]);

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold">Job reports</h1>
      <p className="mb-4 text-sm text-slate-500">
        Worker updates from the Telegram job-reports group, waiting for review before they become Jobs.
      </p>

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
          placeholder="Search sender, message, property..."
          className="ml-auto w-72 rounded border border-slate-300 px-3 py-1.5 text-sm"
        />
      </div>

      {loading && <p className="text-sm text-slate-400">Loading...</p>}
      {!loading && reports.length === 0 && (
        <p className="text-sm text-slate-400">
          {status === 'PENDING' ? 'No pending reports - all caught up.' : 'No reports match these filters.'}
        </p>
      )}

      <div className="space-y-4">
        {reports.map((r) => (
          <ReportCard
            key={r.id}
            report={r}
            accounts={accounts}
            onDone={() => setReports((prev) => prev.filter((x) => x.id !== r.id))}
          />
        ))}
      </div>
    </div>
  );
}

function ReportCard({
  report,
  accounts,
  onDone,
}: {
  report: IncomingReport;
  accounts: Account[];
  onDone: () => void;
}) {
  const [accountId, setAccountId] = useState(report.matchedProperty?.account.id ?? '');
  const [propertyId, setPropertyId] = useState(report.matchedPropertyId ?? '');
  const [title, setTitle] = useState(report.suggestedTitle ?? '');
  const [description, setDescription] = useState(report.suggestedDescription ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const isPending = report.status === 'PENDING';

  async function convert() {
    if (!accountId || !title) {
      setError('Customer and title are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.post(`/incoming-reports/${report.id}/convert`, {
        accountId,
        propertyId: propertyId || undefined,
        title,
        description: description || undefined,
      });
      onDone();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  }

  async function dismiss() {
    setSaving(true);
    setError(null);
    try {
      await api.post(`/incoming-reports/${report.id}/dismiss`);
      onDone();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
        <span>{report.senderName ?? 'Unknown sender'} · Telegram</span>
        <div className="flex items-center gap-2">
          {!isPending && (
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                report.status === 'CONVERTED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {report.status}
            </span>
          )}
          <span>{new Date(report.receivedAt).toLocaleString()}</span>
        </div>
      </div>

      {report.rawText && (
        <p className="mb-3 whitespace-pre-wrap rounded bg-slate-50 p-2 text-sm text-slate-700">{report.rawText}</p>
      )}

      {report.photoUrls.length > 0 && (
        <div className="mb-3 grid grid-cols-4 gap-2">
          {report.photoUrls.map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              <img src={url} alt="" className="h-24 w-full rounded border border-slate-200 object-cover" />
            </a>
          ))}
        </div>
      )}

      {report.suggestedPropertyText && (
        <p className="mb-3 text-xs text-slate-400">
          Property mentioned in message: "{report.suggestedPropertyText}"
          {!report.matchedPropertyId && ' — no confident match, pick it below'}
        </p>
      )}

      {!isPending ? (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            {report.status === 'CONVERTED' && report.jobId ? (
              <>
                Converted to job — {title || 'untitled'}
                {selectedAccount && ` (${selectedAccount.name})`}
              </>
            ) : (
              'Dismissed'
            )}
          </span>
          {report.status === 'CONVERTED' && report.jobId && (
            <Link to={`/jobs/${report.jobId}`} className="text-blue-600 hover:underline">
              View job
            </Link>
          )}
        </div>
      ) : (
        <>
          {error && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                Customer
                <select
                  value={accountId}
                  onChange={(e) => {
                    setAccountId(e.target.value);
                    setPropertyId('');
                  }}
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

              <label className="block text-sm">
                Property
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  disabled={!selectedAccount || selectedAccount.properties.length === 0}
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                >
                  <option value="">None</option>
                  {selectedAccount?.properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block text-sm">
              Title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="block text-sm">
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              />
            </label>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={convert}
              disabled={saving}
              className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Create job
            </button>
            <button
              type="button"
              onClick={dismiss}
              disabled={saving}
              className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-600 disabled:opacity-50"
            >
              Dismiss
            </button>
            {accountId && (
              <Link to={`/accounts/${accountId}`} className="ml-auto text-xs text-blue-600">
                View customer
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}
