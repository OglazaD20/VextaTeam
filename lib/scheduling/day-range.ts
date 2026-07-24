import { addDays, setHours, setMinutes, setSeconds, startOfDay, endOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

export function getTodayRangeUtc(timeZone: string, reference = new Date()) {
  const nowInZone = toZonedTime(reference, timeZone);

  return {
    start: fromZonedTime(startOfDay(nowInZone), timeZone),
    end: fromZonedTime(endOfDay(nowInZone), timeZone),
  };
}

/** Same as getTodayRangeUtc but for an arbitrary "YYYY-MM-DD" day key, not just today. */
export function getDayRangeUtc(timeZone: string, dayKey: string) {
  const [year, month, day] = dayKey.split("-").map(Number);
  const localMidnight = new Date(year, month - 1, day);

  return {
    start: fromZonedTime(startOfDay(localMidnight), timeZone),
    end: fromZonedTime(endOfDay(localMidnight), timeZone),
  };
}

/** Today's wake-to-sleep window (e.g. "07:00" to "23:00") as UTC instants. */
export function getWakingWindowUtc(
  timeZone: string,
  wakeTime: string,
  sleepTime: string,
  reference = new Date(),
) {
  const nowInZone = toZonedTime(reference, timeZone);
  const todayStart = startOfDay(nowInZone);

  const applyTime = (base: Date, time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return setSeconds(setMinutes(setHours(base, hours), minutes), 0);
  };

  const wakeLocal = applyTime(todayStart, wakeTime);
  let sleepLocal = applyTime(todayStart, sleepTime);
  if (sleepLocal.getTime() <= wakeLocal.getTime()) {
    sleepLocal = addDays(sleepLocal, 1);
  }

  return {
    start: fromZonedTime(wakeLocal, timeZone),
    end: fromZonedTime(sleepLocal, timeZone),
  };
}
