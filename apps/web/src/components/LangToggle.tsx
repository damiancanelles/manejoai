import { useI18n, type Lang } from '../i18n';

const LANGS: Lang[] = ['en', 'es'];

/**
 * EN / ES segmented switch. The choice is remembered in localStorage
 * (see i18n/index.tsx) so it sticks across reloads.
 */
export default function LangToggle({ className = '' }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div className={`inline-flex overflow-hidden rounded-md border border-slate-300 text-xs font-semibold ${className}`}>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`px-2 py-1 uppercase transition-colors ${
            lang === l ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
