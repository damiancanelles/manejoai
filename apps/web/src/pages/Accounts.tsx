import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

interface Account {
  id: string;
  name: string;
  type: 'INDIVIDUAL' | 'MULTIFAMILY';
  properties: { id: string }[];
}

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'INDIVIDUAL' | 'MULTIFAMILY'>('INDIVIDUAL');

  function load() {
    setLoading(true);
    api
      .get<Account[]>('/accounts')
      .then(setAccounts)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await api.post('/accounts', { name, type });
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
          className="rounded bg-slate-900 px-4 py-2 text-sm text-white"
        >
          {showForm ? 'Cancel' : 'New customer'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="mb-6 flex items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <label className="text-sm">
            Name
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-64 rounded border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Type
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="mt-1 block rounded border border-slate-300 px-3 py-2"
            >
              <option value="INDIVIDUAL">Individual customer</option>
              <option value="MULTIFAMILY">Multifamily / property owner</option>
            </select>
          </label>
          <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm text-white">
            Create
          </button>
        </form>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Properties</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">
                    <Link to={`/accounts/${a.id}`} className="text-blue-600 hover:underline">
                      {a.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{a.type === 'MULTIFAMILY' ? 'Multifamily' : 'Individual'}</td>
                  <td className="px-4 py-2">{a.properties.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
