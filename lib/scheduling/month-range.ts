import { endOfDay, endOfMonth, endOfWeek, eachDayOfInterval, startOfDay, startOfWeek } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

/** Full Mon–Sun week grid covering the given month, padded with adjacent-month days. */
export function getMonthGridDays(year: number, monthIndex0: number): Date[] {
  const first = new Date(year, monthIndex0, 1);
  const last = endOfMonth(first);
  const gridStart = startOfWeek(first, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(last, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: gridStart, end: gridEnd });
}

export function getMonthRangeUtc(timeZone: string, year: number, monthIndex0: number) {
  const days = getMonthGridDays(year, monthIndex0);
  return {
    start: fromZonedTime(startOfDay(days[0]), timeZone),
    end: fromZonedTime(endOfDay(days[days.length - 1]), timeZone),
    days,
  };
}

export function dateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
