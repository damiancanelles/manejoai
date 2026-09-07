import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import AccountDetail from './pages/AccountDetail';
import Jobs from './pages/Jobs';
import JobNew from './pages/JobNew';
import JobDetail from './pages/JobDetail';
import Quotes from './pages/Quotes';
import QuoteNew from './pages/QuoteNew';
import QuoteDetail from './pages/QuoteDetail';
import Invoices from './pages/Invoices';
import InvoiceDetail from './pages/InvoiceDetail';
import InvoiceNew from './pages/InvoiceNew';
import Reports from './pages/Reports';
import IncomingReports from './pages/IncomingReports';
import ChangePassword from './pages/ChangePassword';
import { isLoggedIn } from './context/AuthContext';

// "/" is the public marketing page for a signed-out visitor - a logged-in
// user lands on the real app (Dashboard, now at /dashboard) instead.
function Home() {
  return isLoggedIn() ? <Navigate to="/dashboard" replace /> : <Landing />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/accounts/:id" element={<AccountDetail />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/new" element={<JobNew />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/quotes" element={<Quotes />} />
          <Route path="/quotes/new" element={<QuoteNew />} />
          <Route path="/quotes/:id" element={<QuoteDetail />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/invoices/new" element={<InvoiceNew />} />
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/job-reports" element={<IncomingReports />} />
          <Route path="/change-password" element={<ChangePassword />} />
        </Route>
      </Route>
    </Routes>
  );
}
