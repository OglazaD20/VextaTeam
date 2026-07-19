import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export function getTodayKey(timeZone: string, reference = new Date()): string {
  return format(toZonedTime(reference, timeZone), "yyyy-MM-dd");
}
