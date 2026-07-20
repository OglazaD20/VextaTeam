import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarWeeks,
  startOfDay,
  startOfWeek,
} from "date-fns";

import type { RecurrenceRule } from "@/types/database";

function advance(date: Date, rule: RecurrenceRule): Date {
  switch (rule.freq) {
    case "daily":
      return addDays(date, rule.interval);
    case "weekly":
      return addWeeks(date, rule.interval);
    case "monthly":
      return addMonths(date, rule.interval);
  }
}

/**
 * Computes concrete occurrence dates (same time-of-day as `anchor`) for a
 * recurrence rule, from `anchor` through `throughDate` inclusive.
 */
export function generateOccurrences(
  anchor: Date,
  rule: RecurrenceRule,
  throughDate: Date,
): Date[] {
  const until = rule.until ? new Date(rule.until) : null;
  const maxCount = rule.count ?? Infinity;
  const occurrences: Date[] = [];

  if (rule.freq === "weekly" && rule.byWeekday && rule.byWeekday.length > 0) {
    const anchorWeekStart = startOfWeek(anchor, { weekStartsOn: 0 });
    let cursor = startOfDay(anchor);

    while (cursor.getTime() <= throughDate.getTime() && occurrences.length < maxCount) {
      const weeksSinceAnchor = differenceInCalendarWeeks(
        startOfWeek(cursor, { weekStartsOn: 0 }),
        anchorWeekStart,
        { weekStartsOn: 0 },
      );

      if (
        weeksSinceAnchor >= 0 &&
        weeksSinceAnchor % rule.interval === 0 &&
        rule.byWeekday.includes(cursor.getDay()) &&
        cursor.getTime() >= startOfDay(anchor).getTime()
      ) {
        if (!until || cursor.getTime() <= until.getTime()) {
          const occurrence = new Date(cursor);
          occurrence.setHours(anchor.getHours(), anchor.getMinutes(), 0, 0);
          occurrences.push(occurrence);
        }
      }
      cursor = addDays(cursor, 1);
    }
    return occurrences;
  }

  let current = anchor;
  while (current.getTime() <= throughDate.getTime() && occurrences.length < maxCount) {
    if (until && current.getTime() > until.getTime()) break;
    occurrences.push(current);
    current = advance(current, rule);
  }
  return occurrences;
}
