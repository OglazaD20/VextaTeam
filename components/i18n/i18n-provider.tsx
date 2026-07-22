"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { dictionaries } from "@/lib/i18n/dictionaries";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/locales";

interface I18nContextValue {
  locale: Locale;
  messages: (typeof dictionaries)[Locale];
  setLocale: (locale: Locale) => void;
}

const I18nContext = React.createContext<I18nContextValue | null>(null);

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = React.useState(initialLocale);

  const setLocale = React.useCallback(
    (next: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      setLocaleState(next);
      // Re-runs Server Components with the new cookie so server-rendered
      // text (page titles, server-fetched labels) updates immediately too —
      // a soft RSC refresh, not a full page reload.
      router.refresh();
    },
    [router],
  );

  const value = React.useMemo<I18nContextValue>(
    () => ({ locale, messages: dictionaries[locale], setLocale }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslations() {
  const ctx = React.useContext(I18nContext);
  if (!ctx) throw new Error("useTranslations must be used within an I18nProvider");
  return ctx;
}
