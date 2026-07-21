import { toZonedTime } from "date-fns-tz";

/**
 * Pure statistical signal computation for the AI Coach — no AI involved here.
 * The AI layer (lib/ai/generate-coaching.ts) only phrases sentences from
 * whatever signals come out of this file; it never invents a number.
 */

export interface TaskRecord {
  status: string;
  priority: number;
  scheduledStart: string | null;
}

export interface FocusRecord {
  dateKey: string;
  actualMinutes: number | null;
  plannedMinutes: number;
  moodAfter: number | null;
}

export interface HealthRecord {
  dateKey: string;
  sleepHours: number | null;
  exerciseMinutes: number | null;
}

export interface WaterRecord {
  loggedAt: string;
}

export interface HabitStreakRecord {
  name: string;
  streak: number;
}

export interface BodyMetricRecord {
  dateKey: string;
  weightKg: number | null;
}

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface TaskCompletionSignal {
  completionRate: number;
  totalTasks: number;
  morningHighPriorityCompletionRate: number | null;
}

export function computeTaskCompletionSignal(
  tasks: TaskRecord[],
  timeZone: string,
): TaskCompletionSignal {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;

  const highPriorityCompleted = tasks.filter(
    (t) => t.priority <= 2 && t.status === "completed" && t.scheduledStart,
  );
  const morningCount = highPriorityCompleted.filter((t) => {
    const hour = toZonedTime(new Date(t.scheduledStart!), timeZone).getHours();
    return hour < 11;
  }).length;

  return {
    completionRate: total > 0 ? Math.round((completed / total) * 100) / 100 : 0,
    totalTasks: total,
    morningHighPriorityCompletionRate:
      highPriorityCompleted.length >= 3
        ? Math.round((morningCount / highPriorityCompleted.length) * 100) / 100
        : null,
  };
}

export interface SleepProductivitySignal {
  betterSleepAvgRatio: number;
  worseSleepAvgRatio: number;
  percentDifference: number;
}

/** Correlates same-day sleep hours with focus-session actual/planned ratio. */
export function computeSleepProductivitySignal(
  health: HealthRecord[],
  focus: FocusRecord[],
  sleepThresholdHours = 7,
): SleepProductivitySignal | null {
  const sleepByDate = new Map(
    health.filter((h) => h.sleepHours !== null).map((h) => [h.dateKey, h.sleepHours!]),
  );

  const betterRatios: number[] = [];
  const worseRatios: number[] = [];

  for (const session of focus) {
    const sleepHours = sleepByDate.get(session.dateKey);
    if (sleepHours === undefined || !session.actualMinutes || session.plannedMinutes <= 0) continue;
    const ratio = session.actualMinutes / session.plannedMinutes;
    if (sleepHours >= sleepThresholdHours) {
      betterRatios.push(ratio);
    } else {
      worseRatios.push(ratio);
    }
  }

  if (betterRatios.length < 3 || worseRatios.length < 3) return null;

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const betterAvg = avg(betterRatios);
  const worseAvg = avg(worseRatios);

  if (worseAvg === 0) return null;

  return {
    betterSleepAvgRatio: Math.round(betterAvg * 100) / 100,
    worseSleepAvgRatio: Math.round(worseAvg * 100) / 100,
    percentDifference: Math.round(((betterAvg - worseAvg) / worseAvg) * 100),
  };
}

export interface WeekdayExerciseSignal {
  weekday: string;
  exerciseRate: number;
}

/** Finds the weekday with the lowest exercise rate, when there's a clear pattern. */
export function computeWeakestExerciseWeekday(
  health: HealthRecord[],
  timeZone: string,
): WeekdayExerciseSignal | null {
  const byWeekday = new Map<number, { total: number; exercised: number }>();

  for (const record of health) {
    const [year, month, day] = record.dateKey.split("-").map(Number);
    const weekday = toZonedTime(new Date(year, month - 1, day, 12), timeZone).getDay();
    const entry = byWeekday.get(weekday) ?? { total: 0, exercised: 0 };
    entry.total += 1;
    if (record.exerciseMinutes && record.exerciseMinutes > 0) entry.exercised += 1;
    byWeekday.set(weekday, entry);
  }

  const withEnoughData = [...byWeekday.entries()].filter(([, v]) => v.total >= 2);
  if (withEnoughData.length < 5) return null;

  const rates = withEnoughData.map(([weekday, v]) => ({
    weekday,
    rate: v.exercised / v.total,
  }));
  rates.sort((a, b) => a.rate - b.rate);
  const weakest = rates[0];

  if (weakest.rate > 0.25) return null;

  return { weekday: WEEKDAY_NAMES[weakest.weekday], exerciseRate: Math.round(weakest.rate * 100) / 100 };
}

export interface HydrationSignal {
  beforeAvgMl: number;
  afterAvgMl: number;
}

/** Compares average water logged before vs after a cutoff hour, across days. */
export function computeHydrationTimingSignal(
  waterLogs: WaterRecord[],
  timeZone: string,
  cutoffHour = 14,
): HydrationSignal | null {
  if (waterLogs.length < 5) return null;

  let beforeTotal = 0;
  let afterTotal = 0;

  for (const log of waterLogs) {
    const hour = toZonedTime(new Date(log.loggedAt), timeZone).getHours();
    if (hour < cutoffHour) beforeTotal += 1;
    else afterTotal += 1;
  }

  const total = beforeTotal + afterTotal;
  if (total === 0) return null;

  return {
    beforeAvgMl: Math.round((beforeTotal / total) * 100),
    afterAvgMl: Math.round((afterTotal / total) * 100),
  };
}

export interface WeightTrendSignal {
  direction: "up" | "down" | "stable";
  changeKg: number;
}

export function computeWeightTrend(metrics: BodyMetricRecord[]): WeightTrendSignal | null {
  const withWeight = metrics.filter((m) => m.weightKg !== null);
  if (withWeight.length < 4) return null;

  const first = withWeight[0].weightKg!;
  const last = withWeight[withWeight.length - 1].weightKg!;
  const changeKg = Math.round((last - first) * 10) / 10;

  let direction: WeightTrendSignal["direction"] = "stable";
  if (Math.abs(changeKg) >= 0.5) direction = changeKg > 0 ? "up" : "down";

  return { direction, changeKg: Math.abs(changeKg) };
}

export interface LongestHabitStreakSignal {
  habitName: string;
  streak: number;
}

export function computeLongestHabitStreak(
  streaks: HabitStreakRecord[],
  minStreak = 7,
): LongestHabitStreakSignal | null {
  const best = [...streaks].sort((a, b) => b.streak - a.streak)[0];
  if (!best || best.streak < minStreak) return null;
  return { habitName: best.name, streak: best.streak };
}

export interface BurnoutSignal {
  recentCompletionRate: number;
  priorCompletionRate: number;
  recentAvgSleepHours: number | null;
  priorAvgSleepHours: number | null;
}

/**
 * Flags a burnout risk when both task completion and sleep have dropped
 * meaningfully between the first and second half of the period.
 */
export function computeBurnoutSignal(
  tasksBySplit: { recent: TaskRecord[]; prior: TaskRecord[] },
  healthBySplit: { recent: HealthRecord[]; prior: HealthRecord[] },
): BurnoutSignal | null {
  const rate = (tasks: TaskRecord[]) =>
    tasks.length > 0 ? tasks.filter((t) => t.status === "completed").length / tasks.length : null;

  const avgSleep = (health: HealthRecord[]) => {
    const withSleep = health.filter((h) => h.sleepHours !== null);
    if (withSleep.length === 0) return null;
    return withSleep.reduce((sum, h) => sum + h.sleepHours!, 0) / withSleep.length;
  };

  const recentRate = rate(tasksBySplit.recent);
  const priorRate = rate(tasksBySplit.prior);
  const recentSleep = avgSleep(healthBySplit.recent);
  const priorSleep = avgSleep(healthBySplit.prior);

  if (recentRate === null || priorRate === null) return null;

  const completionDropped = priorRate - recentRate >= 0.15;
  const sleepDropped =
    recentSleep !== null && priorSleep !== null && priorSleep - recentSleep >= 1;

  if (!completionDropped && !sleepDropped) return null;

  return {
    recentCompletionRate: Math.round(recentRate * 100) / 100,
    priorCompletionRate: Math.round(priorRate * 100) / 100,
    recentAvgSleepHours: recentSleep !== null ? Math.round(recentSleep * 10) / 10 : null,
    priorAvgSleepHours: priorSleep !== null ? Math.round(priorSleep * 10) / 10 : null,
  };
}
