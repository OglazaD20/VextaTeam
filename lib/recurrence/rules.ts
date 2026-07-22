import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarWeeks,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

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
 *
 * `timeZone` is the owning user's IANA zone — weekday/day-boundary math for
 * `byWeekday` rules runs against their local calendar, not the server
 * process's (UTC in production), since a plain UTC weekday can differ from
 * the user's local weekday near midnight in either direction and would
 * otherwise generate occurrences a day off from what they scheduled.
 */
export function generateOccurrences(
  anchor: Date,
  rule: RecurrenceRule,
  throughDate: Date,
  timeZone = "UTC",
): Date[] {
  const until = rule.until ? new Date(rule.until) : null;
  const maxCount = rule.count ?? Infinity;
  const occurrences: Date[] = [];

  if (rule.freq === "weekly" && rule.byWeekday && rule.byWeekday.length > 0) {
    const zonedAnchor = toZonedTime(anchor, timeZone);
    const zonedThrough = toZonedTime(throughDate, timeZone);
    const anchorDayStart = startOfDay(zonedAnchor);
    const anchorWeekStart = startOfWeek(zonedAnchor, { weekStartsOn: 0 });
    let cursor = anchorDayStart;

    while (cursor.getTime() <= zonedThrough.getTime() && occurrences.length < maxCount) {
      const weeksSinceAnchor = differenceInCalendarWeeks(
        startOfWeek(cursor, { weekStartsOn: 0 }),
        anchorWeekStart,
        { weekStartsOn: 0 },
      );

      if (
        weeksSinceAnchor >= 0 &&
        weeksSinceAnchor % rule.interval === 0 &&
        rule.byWeekday.includes(cursor.getDay()) &&
        cursor.getTime() >= anchorDayStart.getTime()
      ) {
        const zonedOccurrence = new Date(cursor);
        zonedOccurrence.setHours(zonedAnchor.getHours(), zonedAnchor.getMinutes(), 0, 0);
        const occurrence = fromZonedTime(zonedOccurrence, timeZone);
        if (!until || occurrence.getTime() <= until.getTime()) {
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
