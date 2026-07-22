"use server";

import {
  computeBalanceScore,
  computeConsistencyScore,
  computeHealthScore,
  computeLifeScore,
  computeLifestyleScore,
  computeProductivityScore,
} from "@/lib/analytics/scores";
import { computeGoalProgressPct } from "@/lib/goals/progress";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult<T = undefined> {
  error?: string;
  data?: T;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  return { supabase, user };
}

export type AnalyticsPeriod = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

const PERIOD_DAYS: Record<AnalyticsPeriod, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

export interface AnalyticsScores {
  productivity: number | null;
  health: number | null;
  lifestyle: number | null;
  consistency: number | null;
  balance: number | null;
  life: number | null;
}

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

/** Computes all 6 scores for a given user over a given date window, from already-fetched raw rows. */
async function computeScoresForWindow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  start: Date,
  end: Date,
): Promise<AnalyticsScores> {
  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));

  const [
    { data: tasks },
    { data: goals },
    { data: focusSessions },
    { data: healthMetrics },
    { data: moodLogs },
    { data: habits },
    { data: habitLogs },
    { data: foodLogs },
    { data: waterLogs },
    { data: savedActivities },
    { data: nutritionSettings },
  ] = await Promise.all([
    supabase
      .from("schedule_items")
      .select("status, category, type")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .gte("scheduled_start", start.toISOString())
      .lte("scheduled_start", end.toISOString()),
    supabase.from("goals").select("id, target_value, current_value, manual_progress_pct").eq("user_id", userId).eq("status", "active"),
    supabase
      .from("focus_sessions")
      .select("actual_duration_minutes, planned_duration_minutes")
      .eq("user_id", userId)
      .gte("started_at", start.toISOString())
      .lte("started_at", end.toISOString()),
    supabase
      .from("health_metrics")
      .select("logged_for_date, sleep_hours, exercise_minutes")
      .eq("user_id", userId)
      .gte("logged_for_date", dateKey(start.toISOString()))
      .lte("logged_for_date", dateKey(end.toISOString())),
    supabase
      .from("mood_logs")
      .select("mood, logged_for_date")
      .eq("user_id", userId)
      .gte("logged_at", start.toISOString())
      .lte("logged_at", end.toISOString()),
    supabase.from("habits").select("id").eq("user_id", userId).eq("is_active", true),
    supabase
      .from("habit_logs")
      .select("habit_id, logged_for_date, completed")
      .eq("user_id", userId)
      .gte("logged_for_date", dateKey(start.toISOString()))
      .lte("logged_for_date", dateKey(end.toISOString())),
    supabase
      .from("food_logs")
      .select("logged_at, calories")
      .eq("user_id", userId)
      .gte("logged_at", start.toISOString())
      .lte("logged_at", end.toISOString()),
    supabase
      .from("water_logs")
      .select("logged_at")
      .eq("user_id", userId)
      .gte("logged_at", start.toISOString())
      .lte("logged_at", end.toISOString()),
    supabase
      .from("saved_activities")
      .select("id, created_at")
      .eq("user_id", userId)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString()),
    supabase.from("nutrition_settings").select("daily_calorie_goal").eq("user_id", userId).maybeSingle(),
  ]);

  // Goal progress (milestone-aware, matching the Goals page's own computation).
  const goalIds = (goals ?? []).map((g) => g.id);
  const { data: milestones } =
    goalIds.length > 0
      ? await supabase.from("goal_milestones").select("goal_id, is_completed").in("goal_id", goalIds)
      : { data: [] as { goal_id: string; is_completed: boolean }[] };
  const milestonesByGoal = new Map<string, { isCompleted: boolean }[]>();
  for (const m of milestones ?? []) {
    if (!milestonesByGoal.has(m.goal_id)) milestonesByGoal.set(m.goal_id, []);
    milestonesByGoal.get(m.goal_id)!.push({ isCompleted: m.is_completed });
  }
  const goalProgressPcts = (goals ?? []).map((g) =>
    computeGoalProgressPct({
      targetValue: g.target_value,
      currentValue: g.current_value,
      manualProgressPct: g.manual_progress_pct,
      milestones: milestonesByGoal.get(g.id) ?? [],
    }),
  );

  const productivity = computeProductivityScore({
    completedTasks: (tasks ?? []).filter((t) => t.status === "completed").length,
    totalTasks: (tasks ?? []).length,
    goalProgressPcts,
    focusRatios: (focusSessions ?? [])
      .filter((f) => f.actual_duration_minutes && f.planned_duration_minutes > 0)
      .map((f) => f.actual_duration_minutes! / f.planned_duration_minutes),
  });

  const sleepHours = (healthMetrics ?? []).map((h) => h.sleep_hours).filter((v): v is number => v !== null);
  const avgSleepHours = sleepHours.length > 0 ? sleepHours.reduce((a, b) => a + b, 0) / sleepHours.length : null;
  const exerciseDays = new Set(
    (healthMetrics ?? []).filter((h) => h.exercise_minutes && h.exercise_minutes > 0).map((h) => h.logged_for_date),
  );
  const hydrationDays = new Set((waterLogs ?? []).map((w) => dateKey(w.logged_at)));
  const caloriesByDay = new Map<string, number>();
  for (const log of foodLogs ?? []) {
    const key = dateKey(log.logged_at);
    caloriesByDay.set(key, (caloriesByDay.get(key) ?? 0) + log.calories);
  }
  const calorieGoal = nutritionSettings?.daily_calorie_goal ?? 2000;
  const daysWithinCalorieGoal = [...caloriesByDay.values()].filter(
    (cal) => Math.abs(cal - calorieGoal) <= calorieGoal * 0.2,
  ).length;

  const health = computeHealthScore({
    avgSleepHours,
    daysWithExercise: exerciseDays.size,
    daysWithHydration: hydrationDays.size,
    daysWithinCalorieGoal,
    totalDays,
  });

  const moodValues = (moodLogs ?? []).map((m) => m.mood);
  const avgMood = moodValues.length > 0 ? moodValues.reduce((a, b) => a + b, 0) / moodValues.length : null;
  const activeHabitCount = (habits ?? []).length;
  const habitCompletionPct =
    activeHabitCount > 0
      ? ((habitLogs ?? []).filter((l) => l.completed).length / (activeHabitCount * totalDays)) * 100
      : null;

  const lifestyle = computeLifestyleScore({
    avgMood,
    discoverActivitiesCount: (savedActivities ?? []).length,
    habitCompletionPct: habitCompletionPct !== null ? Math.min(100, habitCompletionPct) : null,
  });

  const activeDays = new Set<string>([
    ...exerciseDays,
    ...hydrationDays,
    ...caloriesByDay.keys(),
    ...(moodLogs ?? []).map((m) => m.logged_for_date),
    ...(habitLogs ?? []).filter((l) => l.completed).map((l) => l.logged_for_date),
  ]);
  const consistency = computeConsistencyScore({ daysWithAnyActivity: activeDays.size, totalDays });

  const categoryCounts: Record<string, number> = {};
  for (const t of tasks ?? []) {
    const key = t.category ?? t.type;
    categoryCounts[key] = (categoryCounts[key] ?? 0) + 1;
  }
  const balance = computeBalanceScore(categoryCounts);

  const life = computeLifeScore({ productivity, health, lifestyle, consistency, balance });

  return { productivity, health, lifestyle, consistency, balance, life };
}

export async function getAnalyticsScores(period: AnalyticsPeriod): Promise<ActionResult<AnalyticsScores>> {
  const { supabase, user } = await requireUser();
  const days = PERIOD_DAYS[period];
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

  try {
    const scores = await computeScoresForWindow(supabase, user.id, start, end);
    return { data: scores };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't compute analytics" };
  }
}

export interface LifeScoreTrendPoint {
  weekLabel: string;
  score: number | null;
}

export async function getLifeScoreTrend(weeks = 8): Promise<ActionResult<LifeScoreTrendPoint[]>> {
  const { supabase, user } = await requireUser();
  const now = new Date();

  try {
    const points = await Promise.all(
      Array.from({ length: weeks }, async (_, i) => {
        const weeksAgo = weeks - 1 - i;
        const end = new Date(now.getTime() - weeksAgo * 7 * 24 * 60 * 60 * 1000);
        const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        const scores = await computeScoresForWindow(supabase, user.id, start, end);
        return {
          weekLabel: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(end),
          score: scores.life,
        };
      }),
    );
    return { data: points };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't compute the trend" };
  }
}
