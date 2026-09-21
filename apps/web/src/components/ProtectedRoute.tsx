import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isCrew, isLoggedIn } from '../context/AuthContext';

export default function ProtectedRoute() {
  const location = useLocation();
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  // A crew account only ever gets /crew - every other API route 403s for
  // it (CrewGuard), so sending it anywhere else in the app would just be a
  // page full of failed requests.
  if (isCrew() && location.pathname !== '/crew') return <Navigate to="/crew" replace />;
  return <Outlet />;
}
