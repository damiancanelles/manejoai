import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { en } from './en';
import { es } from './es';

// Same dictionaries and t() contract as apps/web/src/i18n - a key added on
// one side should be added on both. See the [[i18n-frontend]] memory note.
export type Lang = 'en' | 'es';

const DICTS: Record<Lang, Record<string, string>> = { en, es };
const STORAGE_KEY = 'manejoai_lang';

function detectDeviceLang(): Lang {
  const tag = Localization.getLocales()[0]?.languageCode ?? 'en';
  return tag.toLowerCase().startsWith('es') ? 'es' : 'en';
}

type Vars = Record<string, string | number>;

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Vars) => string;
  locale: string;
  // AsyncStorage's read is async, unlike the web app's synchronous
  // localStorage read - screens that care can wait on this before
  // rendering anything language-sensitive, though the device-locale
  // default means there's rarely a visible flash either way.
  ready: boolean;
}

const I18nContext = createContext<I18nValue | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectDeviceLang);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'en' || stored === 'es') setLangState(stored);
      })
      .finally(() => setReady(true));
  }, []);

  const setLang = useCallback((l: Lang) => {
    AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {});
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
    () => ({ lang, setLang, t, locale: lang === 'es' ? 'es' : 'en-US', ready }),
    [lang, setLang, t, ready],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function useT(): I18nValue['t'] {
  return useI18n().t;
}
