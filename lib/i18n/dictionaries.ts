import en, { type Messages } from "@/lib/i18n/messages/en";
import pl from "@/lib/i18n/messages/pl";
import type { Locale } from "@/lib/i18n/locales";

export const dictionaries: Record<Locale, Messages> = { en, pl };

export type { Messages };
