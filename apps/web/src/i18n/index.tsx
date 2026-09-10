import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { en } from './en';
import { es } from './es';

export type Lang = 'en' | 'es';

const DICTS: Record<Lang, Record<string, string>> = { en, es };
const STORAGE_KEY = 'manejoai_lang';

function detectLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'es') return stored;
  } catch {
    /* private mode / disabled storage - fall through to the browser default */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'en';
  return nav.startsWith('es') ? 'es' : 'en';
}

type Vars = Record<string, string | number>;

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Translate a key, filling {placeholders} from `vars`. Falls back to English, then the key itself. */
  t: (key: string, vars?: Vars) => string;
  /** BCP-47 locale for Intl / toLocale* calls. */
  locale: string;
}

const I18nContext = createContext<I18nValue | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* not fatal - the choice just won't survive a reload */
    }
    setLangState(l);
  }, []);

  const t = useCallback(
    (key: string, vars?: Vars) => {
      const template = DICTS[lang][key] ?? en[key] ?? key;
      if (!vars) return template;
      return template.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
    },
    [lang],
  );

  const value = useMemo<I18nValue>(
    () => ({ lang, setLang, t, locale: lang === 'es' ? 'es' : 'en-US' }),
    [lang, setLang, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

/** Shorthand for components that only need the translate function. */
export function useT(): I18nValue['t'] {
  return useI18n().t;
}
