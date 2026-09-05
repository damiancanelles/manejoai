import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';

interface Photo {
  id: string;
  url: string;
  caption?: string;
}
interface Job {
  id: string;
  title: string;
  description?: string;
  status: string;
  accountId: string;
  propertyId?: string | null;
  scheduledAt?: string | null;
  account: { id: string; name: string };
  property?: { id: string; name: string } | null;
  invoices: { id: string }[];
  photos: Photo[];
}
interface Account {
  id: string;
  name: string;
  properties: { id: string; name: string }[];
}

function toDateInputValue(iso?: string | null) {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [formAccountId, setFormAccountId] = useState('');
  const [formAccount, setFormAccount] = useState<Account | null>(null);

  function load() {
    if (!id) return;
    api.get<Job>(`/jobs/${id}`).then(setJob);
  }

  useEffect(load, [id]);

  useEffect(() => {
    if (!editing) return;
    api.get<Account[]>('/accounts').then(setAccounts);
    if (job) setFormAccountId(job.accountId);
  }, [editing, job?.accountId]);

  useEffect(() => {
    if (!formAccountId) {
      setFormAccount(null);
      return;
    }
    api.get<Account>(`/accounts/${formAccountId}`).then(setFormAccount);
  }, [formAccountId]);

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    try {
      await api.post(`/jobs/${id}/photos`, form);
      load();
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function updateStatus(status: string) {
    if (!id) return;
    await api.patch(`/jobs/${id}`, { status });
    load();
  }

  async function onSaveEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id) return;
    setError(null);
    const form = new FormData(e.currentTarget);
    const scheduledAt = form.get('scheduledAt') as string;
    try {
      await api.patch(`/jobs/${id}`, {
        accountId: formAccountId,
        propertyId: (form.get('propertyId') as string) || null,
        title: form.get('title'),
        description: (form.get('description') as string) || undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      });
      setEditing(false);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (!job) return <p>Loading...</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{job.title}</h1>
          {job.description && <p className="mt-1 text-slate-600">{job.description}</p>}
          <p className="mt-2 text-sm text-slate-500">
            <Link to={`/accounts/${job.account.id}`} className="text-blue-600 hover:underline">
              {job.account.name}
            </Link>
            {job.property && <> — {job.property.name}</>}
            {job.scheduledAt && <> — scheduled {new Date(job.scheduledAt).toLocaleDateString()}</>}
          </p>
        </div>
        <button
          onClick={() => setEditing((v) => !v)}
          className="shrink-0 rounded border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
        >
          {editing ? 'Cancel' : 'Edit job'}
        </button>
      </div>

      {editing && (
        <form onSubmit={onSaveEdit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
          {error && <div className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}

          <label className="block text-sm">
            Customer
            <select
              value={formAccountId}
              onChange={(e) => setFormAccountId(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            {formAccountId !== job.accountId && job.invoices.length > 0 && (
              <p className="mt-1 text-xs text-red-600">
                This job has an invoice attached, so it can't be moved to a different customer.
              </p>
            )}
          </label>

          <label className="block text-sm">
            Property (optional)
            <select
              name="propertyId"
              defaultValue={formAccountId === job.accountId ? job.propertyId || '' : ''}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            >
              <option value="">None</option>
              {formAccount?.properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            Title
            <input
              name="title"
              type="text"
              defaultValue={job.title}
              required
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="block text-sm">
            Description (optional)
            <textarea
              name="description"
              defaultValue={job.description}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="block text-sm">
            Scheduled for (optional)
            <input
              name="scheduledAt"
              type="date"
              defaultValue={toDateInputValue(job.scheduledAt)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>

          <button
            type="submit"
            disabled={formAccountId !== job.accountId && job.invoices.length > 0}
            className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Save changes
          </button>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-500">Status:</span>
        {['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'].map((s) => (
          <button
            key={s}
            onClick={() => updateStatus(s)}
            className={`rounded px-2 py-1 text-xs ${
              job.status === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Photos</h2>
          <label className="cursor-pointer text-sm text-blue-600">
            {uploading ? 'Uploading...' : '+ Add photo'}
            <input type="file" accept="image/*" className="hidden" onChange={onFileChange} disabled={uploading} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {job.photos.map((p) => (
            <a key={p.id} href={p.url} target="_blank" rel="noreferrer">
              <img src={p.url} alt={p.caption || ''} className="h-32 w-full rounded border border-slate-200 object-cover" />
            </a>
          ))}
          {job.photos.length === 0 && <p className="text-sm text-slate-400">No photos yet.</p>}
        </div>
      </section>
    </div>
  );
}
