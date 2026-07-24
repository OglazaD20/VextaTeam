export const LOCALES = ["en", "pl", "de", "fr", "it", "es"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  pl: "Polski",
  de: "Deutsch",
  fr: "Français",
  it: "Italiano",
  es: "Español",
};

export const LOCALE_COOKIE = "locale";

/** BCP-47 tags for Intl.* formatting (dates, numbers) keyed by our short locale codes. */
export const LOCALE_INTL_TAG: Record<Locale, string> = {
  en: "en-US",
  pl: "pl-PL",
  de: "de-DE",
  fr: "fr-FR",
  it: "it-IT",
  es: "es-ES",
};

/** Full language name for AI system prompts (never abbreviated — models follow "respond in French" more reliably than "respond in fr"). */
export const LOCALE_LANGUAGE_NAME: Record<Locale, string> = {
  en: "English",
  pl: "Polish",
  de: "German",
  fr: "French",
  it: "Italian",
  es: "Spanish",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}
