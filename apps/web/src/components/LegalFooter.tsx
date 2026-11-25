import { Link } from 'react-router-dom';
import { SUPPORT_EMAIL } from '../lib/support';

// Shared footer for the public legal pages (Privacy, Terms). English only,
// like the pages themselves.
export default function LegalFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-6 text-sm text-slate-500">
        <Link to="/" className="hover:text-indigo-600 hover:underline">
          manejoai
        </Link>
        <Link to="/terms" className="hover:text-indigo-600 hover:underline">
          Terms of Service
        </Link>
        <Link to="/privacy" className="hover:text-indigo-600 hover:underline">
          Privacy Policy
        </Link>
        <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-indigo-600 hover:underline">
          Support: {SUPPORT_EMAIL}
        </a>
      </div>
    </footer>
  );
}
