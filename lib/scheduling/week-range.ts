import { endOfWeek, startOfWeek } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

export function getThisWeekRangeUtc(timeZone: string, reference = new Date()) {
  const nowInZone = toZonedTime(reference, timeZone);
  const weekStart = startOfWeek(nowInZone, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(nowInZone, { weekStartsOn: 1 });

  return {
    start: fromZonedTime(weekStart, timeZone),
    end: fromZonedTime(weekEnd, timeZone),
  };
}
