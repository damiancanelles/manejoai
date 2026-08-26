import { ChangeEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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
  photos: Photo[];
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [uploading, setUploading] = useState(false);

  function load() {
    if (!id) return;
    api.get<Job>(`/jobs/${id}`).then(setJob);
  }

  useEffect(load, [id]);

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

  if (!job) return <p>Loading...</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{job.title}</h1>
        {job.description && <p className="mt-1 text-slate-600">{job.description}</p>}
      </div>

      <div className="flex items-center gap-2">
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
        <div className="grid grid-cols-3 gap-3">
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
