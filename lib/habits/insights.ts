import { differenceInCalendarDays, format, subDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";

import { computeStreak } from "./streak";

export interface HabitInsightInput {
  id: string;
  name: string;
  cadence: string;
  createdAt: string;
}

export interface HabitSignal {
  habitId: string;
  name: string;
  cadence: string;
  eligibleDays: number;
  completedDays: number;
  completionRate: number;
  currentStreak: number;
  longestGapDays: number;
  daysSinceLastLog: number | null;
  totalLogsEver: number;
  reason: "never_logged" | "streak_broken" | "low_completion";
}

const LOOKBACK_DAYS = 30;
const LOW_COMPLETION_THRESHOLD = 0.5;

/**
 * Pure signal computation over habit history — no AI involved. The AI layer
 * only phrases recommendations from these numbers, it never invents them.
 */
export function computeHabitSignals(
  habits: HabitInsightInput[],
  logsByHabit: Map<string, Set<string>>,
  timeZone: string,
  reference = new Date(),
): HabitSignal[] {
  const today = toZonedTime(reference, timeZone);
  const signals: HabitSignal[] = [];

  for (const habit of habits) {
    const completedDates = logsByHabit.get(habit.id) ?? new Set<string>();
    const createdAt = toZonedTime(new Date(habit.createdAt), timeZone);
    const daysSinceCreation = Math.max(0, differenceInCalendarDays(today, createdAt));
    const eligibleDays = Math.min(LOOKBACK_DAYS, daysSinceCreation + 1);

    let completedDays = 0;
    let longestGap = 0;
    let runningGap = 0;
    let longestPastStreak = 0;
    let runningStreak = 0;
    let daysSinceLastLog: number | null = null;

    for (let i = 0; i < eligibleDays; i++) {
      const key = format(subDays(today, i), "yyyy-MM-dd");
      if (completedDates.has(key)) {
        completedDays += 1;
        if (daysSinceLastLog === null) daysSinceLastLog = i;
        runningGap = 0;
        runningStreak += 1;
        longestPastStreak = Math.max(longestPastStreak, runningStreak);
      } else {
        runningGap += 1;
        longestGap = Math.max(longestGap, runningGap);
        runningStreak = 0;
      }
    }

    const completionRate = eligibleDays > 0 ? completedDays / eligibleDays : 0;
    const totalLogsEver = completedDates.size;
    const currentStreak = computeStreak(completedDates, timeZone, reference);

    let reason: HabitSignal["reason"] | null = null;
    if (totalLogsEver === 0 && daysSinceCreation >= 2) {
      reason = "never_logged";
    } else if (
      currentStreak === 0 &&
      longestPastStreak >= 3 &&
      daysSinceLastLog !== null &&
      daysSinceLastLog <= 10
    ) {
      reason = "streak_broken";
    } else if (
      currentStreak === 0 &&
      totalLogsEver > 0 &&
      eligibleDays >= 7 &&
      completionRate < LOW_COMPLETION_THRESHOLD
    ) {
      reason = "low_completion";
    }

    if (reason) {
      signals.push({
        habitId: habit.id,
        name: habit.name,
        cadence: habit.cadence,
        eligibleDays,
        completedDays,
        completionRate,
        currentStreak,
        longestGapDays: longestGap,
        daysSinceLastLog,
        totalLogsEver,
        reason,
      });
    }
  }

  return signals;
}
