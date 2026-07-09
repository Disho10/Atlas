'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { translations, type Locale, type TranslationKey } from './dictionary';

const LocaleCtx = createContext<{
  locale: Locale;
  t: (key: TranslationKey) => string;
  setLocale: (l: Locale) => void;
}>({
  locale: 'en',
  t: key => translations.en[key] ?? key,
  setLocale: () => {},
});

export const useLocale = () => useContext(LocaleCtx);

const COOKIE_NAME = 'atlas-locale';

export function LocaleProvider({ children, initialLocale }: { children: ReactNode; initialLocale: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // One-time pickup of a previously-chosen locale from the cookie. Runs
  // after mount (not during SSR) so the server can keep prerendering pages
  // statically — see the comment in app/layout.tsx for why. This means a
  // returning Arabic-preference visitor briefly sees English on first paint
  // before this flips it; that trade-off was chosen deliberately.
  useEffect(() => {
    const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=(ar|en)`));
    if (match && match[1] !== locale) setLocaleState(match[1] as Locale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    document.cookie = `${COOKIE_NAME}=${l}; path=/; max-age=31536000; SameSite=Lax`;
  };

  const t = (key: TranslationKey) => translations[locale][key] ?? translations.en[key] ?? key;

  return <LocaleCtx.Provider value={{ locale, t, setLocale }}>{children}</LocaleCtx.Provider>;
}

export { COOKIE_NAME };
