import { toZonedTime } from "date-fns-tz";

/**
 * Pure statistical signal computation for mood — same principle as
 * lib/coach/signals.ts: the AI layer only phrases sentences from whatever
 * comes out of here, it never invents a number or correlation.
 */

export interface MoodRecord {
  loggedAt: string;
  mood: number;
  stress: number | null;
  energy: number | null;
}

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface MoodTrendSignal {
  earlierAvg: number;
  recentAvg: number;
  direction: "improving" | "declining" | "stable";
}

/** Splits the period in half by time and compares average mood. */
export function computeMoodTrend(logs: MoodRecord[]): MoodTrendSignal | null {
  if (logs.length < 6) return null;

  const sorted = [...logs].sort(
    (a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime(),
  );
  const mid = Math.floor(sorted.length / 2);
  const earlier = sorted.slice(0, mid);
  const recent = sorted.slice(mid);

  const avg = (arr: MoodRecord[]) => arr.reduce((sum, r) => sum + r.mood, 0) / arr.length;
  const earlierAvg = Math.round(avg(earlier) * 10) / 10;
  const recentAvg = Math.round(avg(recent) * 10) / 10;

  let direction: MoodTrendSignal["direction"] = "stable";
  if (recentAvg - earlierAvg >= 0.4) direction = "improving";
  else if (earlierAvg - recentAvg >= 0.4) direction = "declining";

  return { earlierAvg, recentAvg, direction };
}

export interface WeekdayMoodSignal {
  bestWeekday: string;
  bestAvg: number;
  worstWeekday: string;
  worstAvg: number;
}

export function computeMoodByWeekday(logs: MoodRecord[], timeZone: string): WeekdayMoodSignal | null {
  const byWeekday = new Map<number, number[]>();

  for (const log of logs) {
    const weekday = toZonedTime(new Date(log.loggedAt), timeZone).getDay();
    if (!byWeekday.has(weekday)) byWeekday.set(weekday, []);
    byWeekday.get(weekday)!.push(log.mood);
  }

  const withEnoughData = [...byWeekday.entries()].filter(([, v]) => v.length >= 2);
  if (withEnoughData.length < 4) return null;

  const averages = withEnoughData.map(([weekday, moods]) => ({
    weekday,
    avg: moods.reduce((a, b) => a + b, 0) / moods.length,
  }));
  averages.sort((a, b) => b.avg - a.avg);

  const best = averages[0];
  const worst = averages[averages.length - 1];
  if (best.avg - worst.avg < 0.5) return null;

  return {
    bestWeekday: WEEKDAY_NAMES[best.weekday],
    bestAvg: Math.round(best.avg * 10) / 10,
    worstWeekday: WEEKDAY_NAMES[worst.weekday],
    worstAvg: Math.round(worst.avg * 10) / 10,
  };
}

export interface MoodSleepCorrelationSignal {
  betterSleepAvgMood: number;
  worseSleepAvgMood: number;
}

/** Correlates same-day mood with sleep hours logged in health_metrics. */
export function computeMoodSleepCorrelation(
  moodLogs: { dateKey: string; mood: number }[],
  sleepByDate: Map<string, number>,
  sleepThresholdHours = 7,
): MoodSleepCorrelationSignal | null {
  const better: number[] = [];
  const worse: number[] = [];

  for (const log of moodLogs) {
    const sleepHours = sleepByDate.get(log.dateKey);
    if (sleepHours === undefined) continue;
    if (sleepHours >= sleepThresholdHours) better.push(log.mood);
    else worse.push(log.mood);
  }

  if (better.length < 3 || worse.length < 3) return null;

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  return {
    betterSleepAvgMood: Math.round(avg(better) * 10) / 10,
    worseSleepAvgMood: Math.round(avg(worse) * 10) / 10,
  };
}
