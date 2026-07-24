/**
 * A small curated set of generic morning motivation lines — deterministically
 * picked from the date so it's stable across a single day (not random on
 * every render) without needing a database table or an AI call for
 * something this low-stakes.
 */
const MORNING_QUOTES = [
  "Small steps today add up to big wins this week.",
  "You don't have to be perfect today — just a little better than yesterday.",
  "One task at a time. That's all today asks of you.",
  "Today is a fresh page — write something good on it.",
  "Progress, not perfection.",
  "The hardest part is starting — you've already done that by opening this.",
  "A calm morning sets the tone for a clear-headed day.",
  "Whatever's on your list today, you're capable of it.",
  "Momentum starts with the first small win — go get it.",
  "Today doesn't need to be huge. It just needs to be yours.",
];

function hashDateKey(dateKey: string): number {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function motivationalQuoteForDate(dateKey: string): string {
  return MORNING_QUOTES[hashDateKey(dateKey) % MORNING_QUOTES.length];
}
