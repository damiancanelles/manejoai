import { Link } from 'react-router-dom';
import { useT } from '../i18n';
import LogoMark from '../components/LogoMark';

// Catch-all for any path no route matches - before this, an unknown path
// (e.g. /terms before it existed) rendered a blank white page.
export default function NotFound() {
  const t = useT();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <LogoMark size={48} />
      <h1 className="mt-4 text-xl font-bold text-slate-900">{t('notFound.title')}</h1>
      <p className="mt-2 text-sm text-slate-500">{t('notFound.body')}</p>
      <Link to="/" className="mt-6 rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700">
        {t('notFound.home')}
      </Link>
    </div>
  );
}
