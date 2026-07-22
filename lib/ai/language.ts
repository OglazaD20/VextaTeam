import { LOCALE_LANGUAGE_NAME, type Locale } from "@/lib/i18n/locales";

/**
 * Appended to every AI system prompt across the app (Coach, Planner,
 * Nutrition Chat, Life Assistant, Memory Q&A, Discover AI, Finance
 * Insights, Goal breakdowns) so every AI system automatically follows the
 * user's selected app language, not just the UI chrome around it.
 */
export function languageInstruction(locale: Locale): string {
  if (locale === "en") {
    return "Respond in English unless the user writes in a different language, in which case follow their language for that reply.";
  }
  return (
    `Always respond in ${LOCALE_LANGUAGE_NAME[locale]} — translate naturally and idiomatically, never a literal ` +
    `word-for-word translation, even when the underlying data (place names, food names, tool results) is in ` +
    `English. If the user writes in a different language than ${LOCALE_LANGUAGE_NAME[locale]}, follow their ` +
    `language for that reply instead — understand mixed-language conversation naturally.`
  );
}
