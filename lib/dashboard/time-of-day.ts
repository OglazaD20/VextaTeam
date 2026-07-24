export type TimeOfDay = "morning" | "afternoon" | "evening";

/** Local hour boundaries: 5-11 morning, 12-17 afternoon, 18-4 evening (wraps past midnight). */
export function getTimeOfDay(timeZone: string, at: Date = new Date()): TimeOfDay {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(at),
  );
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "evening";
}
