import en, { type Messages } from "@/lib/i18n/messages/en";
import pl from "@/lib/i18n/messages/pl";
import de from "@/lib/i18n/messages/de";
import fr from "@/lib/i18n/messages/fr";
import it from "@/lib/i18n/messages/it";
import es from "@/lib/i18n/messages/es";
import type { Locale } from "@/lib/i18n/locales";

export const dictionaries: Record<Locale, Messages> = { en, pl, de, fr, it, es };

export type { Messages };
