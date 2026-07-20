import { addDays, format, subDays, subMonths } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

export type StatsRange = "week" | "month" | "year";

export interface RangeWindow {
  start: Date;
  end: Date;
  /** Bucket keys in chronological order, either "yyyy-MM-dd" (week/month) or "yyyy-MM" (year). */
  bucketKeys: string[];
  bucketUnit: "day" | "month";
  labelForKey: (key: string) => string;
}

export function getStatsRangeWindow(
  range: StatsRange,
  timeZone: string,
  reference = new Date(),
): RangeWindow {
  const todayInZone = toZonedTime(reference, timeZone);

  if (range === "year") {
    const bucketKeys: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const month = subMonths(todayInZone, i);
      bucketKeys.push(`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`);
    }
    const start = subMonths(todayInZone, 11);
    start.setDate(1);
    return {
      start: fromZonedTime(start, timeZone),
      end: fromZonedTime(todayInZone, timeZone),
      bucketKeys,
      bucketUnit: "month",
      labelForKey: (key) => {
        const [year, month] = key.split("-").map(Number);
        return new Intl.DateTimeFormat(undefined, { month: "short" }).format(
          new Date(year, month - 1, 1),
        );
      },
    };
  }

  const days = range === "month" ? 30 : 7;
  const bucketKeys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    bucketKeys.push(format(subDays(todayInZone, i), "yyyy-MM-dd"));
  }
  const start = subDays(todayInZone, days - 1);

  return {
    start: fromZonedTime(start, timeZone),
    end: fromZonedTime(addDays(todayInZone, 1), timeZone),
    bucketKeys,
    bucketUnit: "day",
    labelForKey: (key) => {
      const [year, month, day] = key.split("-").map(Number);
      return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
        new Date(year, month - 1, day),
      );
    },
  };
}

export function keyForInstant(date: Date, timeZone: string, unit: "day" | "month"): string {
  const zoned = toZonedTime(date, timeZone);
  if (unit === "month") {
    return `${zoned.getFullYear()}-${String(zoned.getMonth() + 1).padStart(2, "0")}`;
  }
  return format(zoned, "yyyy-MM-dd");
}
