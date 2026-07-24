import { format, subDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export function computeStreak(
  completedDates: Set<string>,
  timeZone: string,
  reference = new Date(),
): number {
  let cursor = toZonedTime(reference, timeZone);
  const todayKey = format(cursor, "yyyy-MM-dd");

  // Logging today is optional without breaking an existing streak — only
  // start subtracting from yesterday if today hasn't been logged yet.
  if (!completedDates.has(todayKey)) {
    cursor = subDays(cursor, 1);
  }

  let streak = 0;
  while (completedDates.has(format(cursor, "yyyy-MM-dd"))) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }

  return streak;
}
