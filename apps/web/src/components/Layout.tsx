import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LogoMark from './LogoMark';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
  }`;

const links = [
  { to: '/', end: true, label: 'Dashboard' },
  { to: '/accounts', label: 'Customers' },
  { to: '/jobs', label: 'Jobs' },
  { to: '/job-reports', label: 'Job Reports' },
  { to: '/quotes', label: 'Quotes' },
  { to: '/invoices', label: 'Invoices' },
  { to: '/reports', label: 'Reports' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setNavOpen(false), [location.pathname]);

  const navContent = (
    <>
      <div className="mb-6 flex items-center gap-2">
        <LogoMark size={32} />
        <span className="text-lg font-bold tracking-tight text-slate-900">manejoai</span>
      </div>
      <nav className="space-y-1">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-8 border-t border-slate-200 pt-4 text-sm text-slate-500">
        <div>{user?.name}</div>
        <button onClick={logout} className="mt-1 text-slate-400 underline hover:text-indigo-600">
          Log out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen md:flex">
      {/* Mobile top bar - hidden on md+ where the sidebar is always visible */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white p-4 shadow-sm md:hidden">
        <div className="flex items-center gap-2">
          <LogoMark size={28} />
          <span className="text-lg font-bold tracking-tight text-slate-900">manejoai</span>
        </div>
        <button
          onClick={() => setNavOpen(true)}
          aria-label="Open menu"
          className="rounded p-2 text-slate-600 hover:bg-slate-100"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile drawer + backdrop */}
      {navOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setNavOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 overflow-y-auto bg-white p-4 shadow-xl">
            {navContent}
          </aside>
        </div>
      )}

      {/* Persistent desktop sidebar */}
      <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white p-4 shadow-sm md:block">
        {navContent}
      </aside>

      <main className="flex-1 overflow-x-hidden p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
