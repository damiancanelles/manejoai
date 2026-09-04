import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
  }`;

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-white p-4">
        <div className="mb-6 text-lg font-bold">manejoai</div>
        <nav className="space-y-1">
          <NavLink to="/" end className={linkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/accounts" className={linkClass}>
            Customers
          </NavLink>
          <NavLink to="/jobs" className={linkClass}>
            Jobs
          </NavLink>
          <NavLink to="/job-reports" className={linkClass}>
            Job Reports
          </NavLink>
          <NavLink to="/quotes" className={linkClass}>
            Quotes
          </NavLink>
          <NavLink to="/invoices" className={linkClass}>
            Invoices
          </NavLink>
          <NavLink to="/reports" className={linkClass}>
            Reports
          </NavLink>
        </nav>
        <div className="mt-8 border-t border-slate-200 pt-4 text-sm text-slate-500">
          <div>{user?.name}</div>
          <button onClick={logout} className="mt-1 text-slate-400 underline hover:text-slate-700">
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
