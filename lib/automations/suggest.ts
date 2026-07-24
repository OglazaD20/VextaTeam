import { subDays } from "date-fns";

import { getTodayKey } from "@/lib/habits/today-key";
import type { createClient } from "@/lib/supabase/server";
import type { AutomationAction, AutomationCondition, AutomationTrigger } from "./types";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const WINDOW_DAYS = 30;
const MIN_SAMPLES = 6;
const GAP_THRESHOLD = 0.4;

function isWeekendKey(dateKey: string): boolean {
  const day = new Date(`${dateKey}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

function dateKeysInWindow(timeZone: string, days: number): string[] {
  const keys: string[] = [];
  for (let i = 0; i < days; i++) {
    keys.push(getTodayKey(timeZone, subDays(new Date(), i)));
  }
  return keys;
}

interface SuggestionDraft {
  title: string;
  description: string;
  evidence: Record<string, unknown>;
  trigger: AutomationTrigger;
  conditionGroups: AutomationCondition[][];
  actions: AutomationAction[];
}

/**
 * Looks for real, computable behavioral gaps — not fabricated ones — in the
 * last 30 days of habit and mood logs, and proposes a matching automation
 * for each genuine gap found. Every number in the suggestion's `evidence`
 * is a real count/rate from the user's own data; nothing is invented.
 * Skipped for a pattern that already has a pending suggestion.
 */
export async function generateBehaviorSuggestions(
  supabase: SupabaseClient,
  userId: string,
  timeZone: string,
): Promise<number> {
  const windowKeys = dateKeysInWindow(timeZone, WINDOW_DAYS);
  const weekdayDayCount = windowKeys.filter((k) => !isWeekendKey(k)).length;
  const weekendDayCount = windowKeys.filter((k) => isWeekendKey(k)).length;
  const earliestKey = windowKeys[windowKeys.length - 1];

  const [{ data: habits }, { data: habitLogs }, { data: moodLogs }, { data: pendingSuggestions }] =
    await Promise.all([
      supabase.from("habits").select("id, name").eq("user_id", userId).eq("is_active", true),
      supabase
        .from("habit_logs")
        .select("habit_id, logged_for_date, completed")
        .eq("user_id", userId)
        .gte("logged_for_date", earliestKey),
      supabase
        .from("mood_logs")
        .select("logged_for_date, mood")
        .eq("user_id", userId)
        .gte("logged_for_date", earliestKey),
      supabase.from("automation_suggestions").select("title").eq("user_id", userId).eq("status", "pending"),
    ]);

  const pendingTitles = new Set((pendingSuggestions ?? []).map((s) => s.title));
  const drafts: SuggestionDraft[] = [];

  for (const habit of habits ?? []) {
    const completedKeys = new Set(
      (habitLogs ?? []).filter((l) => l.habit_id === habit.id && l.completed).map((l) => l.logged_for_date),
    );
    if (completedKeys.size < MIN_SAMPLES) continue;

    const weekdayCompleted = [...completedKeys].filter((k) => !isWeekendKey(k)).length;
    const weekendCompleted = completedKeys.size - weekdayCompleted;
    const weekdayRate = weekdayDayCount > 0 ? weekdayCompleted / weekdayDayCount : 0;
    const weekendRate = weekendDayCount > 0 ? weekendCompleted / weekendDayCount : 0;

    if (weekdayRate - weekendRate >= GAP_THRESHOLD && weekdayRate >= 0.5) {
      const title = `Weekend reminder for "${habit.name}"?`;
      if (pendingTitles.has(title)) continue;
      drafts.push({
        title,
        description: `You keep up "${habit.name}" on ${Math.round(weekdayRate * 100)}% of weekdays but only ${Math.round(weekendRate * 100)}% of weekends over the last ${WINDOW_DAYS} days. Want a Saturday morning reminder for it?`,
        evidence: { habitName: habit.name, weekdayRatePct: Math.round(weekdayRate * 100), weekendRatePct: Math.round(weekendRate * 100), windowDays: WINDOW_DAYS },
        trigger: { type: "schedule", time: "09:00", daysOfWeek: [6] },
        conditionGroups: [],
        actions: [{ type: "send_notification", title: "Habit reminder", body: `Don't forget: ${habit.name}` }],
      });
    } else if (weekendRate - weekdayRate >= GAP_THRESHOLD && weekendRate >= 0.5) {
      const title = `Weekday reminder for "${habit.name}"?`;
      if (pendingTitles.has(title)) continue;
      drafts.push({
        title,
        description: `You keep up "${habit.name}" on ${Math.round(weekendRate * 100)}% of weekends but only ${Math.round(weekdayRate * 100)}% of weekdays over the last ${WINDOW_DAYS} days. Want a weekday morning reminder for it?`,
        evidence: { habitName: habit.name, weekdayRatePct: Math.round(weekdayRate * 100), weekendRatePct: Math.round(weekendRate * 100), windowDays: WINDOW_DAYS },
        trigger: { type: "schedule", time: "08:00", daysOfWeek: [1, 2, 3, 4, 5] },
        conditionGroups: [],
        actions: [{ type: "send_notification", title: "Habit reminder", body: `Don't forget: ${habit.name}` }],
      });
    }
  }

  // Mood-by-weekday dip: flag a specific weekday whose average mood is
  // meaningfully lower than the rest, if there's enough data to trust it.
  const moodByDay = new Map<number, number[]>();
  for (const log of moodLogs ?? []) {
    const day = new Date(`${log.logged_for_date}T00:00:00Z`).getUTCDay();
    if (!moodByDay.has(day)) moodByDay.set(day, []);
    moodByDay.get(day)!.push(log.mood);
  }
  if (moodByDay.size >= 5) {
    const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const averages = [...moodByDay.entries()]
      .filter(([, values]) => values.length >= 3)
      .map(([day, values]) => ({ day, avg: values.reduce((a, b) => a + b, 0) / values.length }));
    if (averages.length >= 5) {
      const overallAvg = averages.reduce((sum, a) => sum + a.avg, 0) / averages.length;
      const worst = averages.reduce((min, a) => (a.avg < min.avg ? a : min));
      if (overallAvg - worst.avg >= 1.2) {
        const title = `${DAY_NAMES[worst.day]} motivation nudge?`;
        if (!pendingTitles.has(title)) {
          drafts.push({
            title,
            description: `Your average mood on ${DAY_NAMES[worst.day]}s (${worst.avg.toFixed(1)}) has been noticeably lower than your overall average (${overallAvg.toFixed(1)}) over the last ${WINDOW_DAYS} days. Want a motivational check-in that morning?`,
            evidence: { weekday: DAY_NAMES[worst.day], weekdayAvgMood: Math.round(worst.avg * 10) / 10, overallAvgMood: Math.round(overallAvg * 10) / 10, windowDays: WINDOW_DAYS },
            trigger: { type: "schedule", time: "08:30", daysOfWeek: [worst.day] },
            conditionGroups: [],
            actions: [{ type: "send_notification", title: "You've got this", body: "A tougher day on average — go easy on yourself and tackle one small thing first." }],
          });
        }
      }
    }
  }

  for (const draft of drafts) {
    await supabase.from("automation_suggestions").insert({
      user_id: userId,
      title: draft.title,
      description: draft.description,
      evidence: draft.evidence,
      proposed_trigger: draft.trigger as unknown as Record<string, unknown>,
      proposed_condition_groups: draft.conditionGroups as unknown as Record<string, unknown>,
      proposed_actions: draft.actions as unknown as Record<string, unknown>,
    });
  }

  return drafts.length;
}
