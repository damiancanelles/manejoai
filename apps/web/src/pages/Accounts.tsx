import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import Pagination from '../components/Pagination';
import { PAGE_SIZE, paginate } from '../lib/paginate';

interface Account {
  id: string;
  name: string;
  type: 'INDIVIDUAL' | 'MULTIFAMILY';
  properties: { id: string }[];
}

const types = ['ALL', 'INDIVIDUAL', 'MULTIFAMILY'];

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [type, setType] = useState('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [newType, setNewType] = useState<'INDIVIDUAL' | 'MULTIFAMILY'>('INDIVIDUAL');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    api
      .get<Account[]>(`/accounts?${params.toString()}`)
      .then(setAccounts)
      .finally(() => setLoading(false));
  }

  useEffect(load, [debouncedSearch]);
  useEffect(() => setPage(1), [type, debouncedSearch]);

  const visibleAccounts = type === 'ALL' ? accounts : accounts.filter((a) => a.type === type);
  const pageAccounts = paginate(visibleAccounts, page);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await api.post('/accounts', { name, type: newType });
    setName('');
    setShowForm(false);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customers</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded bg-indigo-600 px-4 py-2 text-sm text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          {showForm ? 'Cancel' : 'New customer'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white shadow-sm p-4">
          <label className="text-sm">
            Name
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 sm:w-64"
            />
          </label>
          <label className="text-sm">
            Type
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as any)}
              className="mt-1 block rounded border border-slate-300 px-3 py-2"
            >
              <option value="INDIVIDUAL">Individual customer</option>
              <option value="MULTIFAMILY">Multifamily / property owner</option>
            </select>
          </label>
          <button
            type="submit"
            className="rounded bg-indigo-600 px-4 py-2 text-sm text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            Create
          </button>
        </form>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`rounded px-3 py-1 text-sm transition-colors ${
                type === t ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t === 'ALL' ? 'ALL' : t === 'MULTIFAMILY' ? 'Multifamily' : 'Individual'}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customer or property name..."
          className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm sm:ml-auto sm:w-72"
        />
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Properties</th>
                </tr>
              </thead>
              <tbody>
                {pageAccounts.map((a) => (
                  <tr key={a.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">
                      <Link to={`/accounts/${a.id}`} className="text-indigo-600 hover:underline">
                        {a.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{a.type === 'MULTIFAMILY' ? 'Multifamily' : 'Individual'}</td>
                    <td className="px-4 py-2">{a.properties.length}</td>
                  </tr>
                ))}
                {visibleAccounts.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-slate-400">
                      No customers match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalItems={visibleAccounts.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </>
      )}
    </div>
  );
}
