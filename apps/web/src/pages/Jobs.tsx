import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

interface Job {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  account: { name: string };
  property?: { name: string } | null;
}

const statuses = ['ALL', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'];

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const path = status === 'ALL' ? '/jobs' : `/jobs?status=${status}`;
    api
      .get<Job[]>(path)
      .then(setJobs)
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Jobs</h1>
        <Link to="/jobs/new" className="rounded bg-slate-900 px-4 py-2 text-sm text-white">
          Log job
        </Link>
      </div>

      <div className="mb-4 flex gap-2">
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

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2">Job</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Property</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Logged</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">
                    <Link to={`/jobs/${j.id}`} className="text-blue-600 hover:underline">
                      {j.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{j.account.name}</td>
                  <td className="px-4 py-2">{j.property?.name || '—'}</td>
                  <td className="px-4 py-2">{j.status}</td>
                  <td className="px-4 py-2">{new Date(j.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-slate-400">
                    No jobs.
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
