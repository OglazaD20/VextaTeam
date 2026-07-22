import { cookies, headers } from "next/headers";

import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES, isLocale, type Locale } from "@/lib/i18n/locales";
import { dictionaries } from "@/lib/i18n/dictionaries";

/**
 * Cookie wins once a user has explicitly picked a language. Otherwise we
 * read Accept-Language server-side so the very first response already
 * renders in the right language — no flash of English before a client
 * effect corrects it.
 */
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;

  const acceptLanguage = (await headers()).get("accept-language");
  if (acceptLanguage) {
    for (const part of acceptLanguage.split(",")) {
      const tag = part.trim().split(";")[0]?.split("-")[0]?.toLowerCase();
      if (isLocale(tag)) return tag;
    }
  }

  return DEFAULT_LOCALE;
}

export async function getDictionary() {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale] };
}

export { LOCALES };
