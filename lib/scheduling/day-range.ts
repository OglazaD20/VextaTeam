import { endOfDay, startOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

export function getTodayRangeUtc(timeZone: string, reference = new Date()) {
  const nowInZone = toZonedTime(reference, timeZone);

  return {
    start: fromZonedTime(startOfDay(nowInZone), timeZone),
    end: fromZonedTime(endOfDay(nowInZone), timeZone),
  };
}
