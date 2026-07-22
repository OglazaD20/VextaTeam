export const LOCALES = ["en", "pl"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  pl: "Polski",
};

export const LOCALE_COOKIE = "locale";

/** BCP-47 tags for Intl.* formatting (dates, numbers) keyed by our short locale codes. */
export const LOCALE_INTL_TAG: Record<Locale, string> = {
  en: "en-US",
  pl: "pl-PL",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}
