"use server";

import {
  computeBalanceScore,
  computeConsistencyScore,
  computeHealthScore,
  computeLifeScore,
  computeLifestyleScore,
  computeProductivityScore,
} from "@/lib/analytics/scores";
import { getHabitsWithStreaks } from "@/lib/habits/get-habits-with-streaks";
import { computeGoalProgressPct } from "@/lib/goals/progress";
import { getStatsRangeWindow, keyForInstant } from "@/lib/stats/bucket-range";
import { createClient } from "@/lib/supabase/server";
import type { ProductivityPoint } from "@/components/stats/productivity-chart";
import type { TaskCompletionPoint } from "@/components/stats/task-completion-chart";

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

export interface AnalyticsCenterSummary {
  productivity: { tasksCompletedThisWeek: number; tasksPlannedThisWeek: number; focusMinutesThisWeek: number };
  health: {
    avgSleepHours: number | null;
    exerciseDaysThisWeek: number;
    latestWeightKg: number | null;
    weightChangeKg: number | null;
  };
  nutrition: { avgDailyCalories: number | null; calorieGoal: number | null; daysLoggedThisWeek: number };
  finance: { spentThisMonth: number; budgetLimit: number | null; currency: string };
  goals: { activeCount: number; avgProgressPct: number | null; completedThisMonth: number };
  habits: { activeCount: number; longestStreak: number };
  mood: { avgMoodThisWeek: number | null };
  learning: { activeCourses: number; dueFlashcards: number; studyStreakDays: number };
  travel: { upcomingTrips: number; pastTrips: number };
}

/** One combined summary pass across every module for the Unified Analytics Center's per-domain tabs — a handful of cheap aggregate reads run in parallel, not the deep per-chart queries the standalone module pages do. */
export async function getAnalyticsCenterSummary(): Promise<ActionResult<AnalyticsCenterSummary>> {
  const { supabase, user } = await requireUser();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dateKey = (d: Date) => d.toISOString().slice(0, 10);

  try {
    const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", user.id).single();
    const timeZone = profile?.timezone ?? "UTC";

    const [
      { data: healthMetrics },
      { data: bodyMetrics },
      { data: foodLogs },
      { data: nutritionSettings },
      { data: transactions },
      { data: budgets },
      { data: financeSettings },
      { data: goals },
      { data: moodLogs },
      habitsWithStreaks,
      { data: weekTasks },
      { data: weekFocusSessions },
      { data: courses },
      { data: dueFlashcards },
      { data: studySessions },
      { data: trips },
    ] = await Promise.all([
      supabase
        .from("health_metrics")
        .select("logged_for_date, sleep_hours, exercise_minutes")
        .eq("user_id", user.id)
        .gte("logged_for_date", dateKey(weekAgo)),
      supabase
        .from("body_metrics")
        .select("logged_for_date, weight_kg")
        .eq("user_id", user.id)
        .order("logged_for_date", { ascending: false })
        .limit(30),
      supabase
        .from("food_logs")
        .select("logged_at, calories")
        .eq("user_id", user.id)
        .gte("logged_at", weekAgo.toISOString()),
      supabase.from("nutrition_settings").select("daily_calorie_goal").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("transactions")
        .select("amount, category")
        .eq("user_id", user.id)
        .eq("type", "expense")
        .gte("occurred_at", monthStart.toISOString()),
      supabase.from("finance_budgets").select("monthly_limit").eq("user_id", user.id),
      supabase.from("finance_settings").select("currency").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("goals")
        .select("id, status, target_value, current_value, manual_progress_pct, completed_at")
        .eq("user_id", user.id)
        .neq("status", "archived"),
      supabase
        .from("mood_logs")
        .select("mood")
        .eq("user_id", user.id)
        .gte("logged_at", weekAgo.toISOString()),
      getHabitsWithStreaks(supabase, user.id, timeZone),
      supabase
        .from("schedule_items")
        .select("status")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .gte("scheduled_start", weekAgo.toISOString()),
      supabase
        .from("focus_sessions")
        .select("actual_duration_minutes")
        .eq("user_id", user.id)
        .gte("started_at", weekAgo.toISOString()),
      supabase.from("courses").select("id").eq("user_id", user.id).eq("status", "active"),
      supabase.from("flashcards").select("id").lte("due_at", now.toISOString()),
      supabase
        .from("study_sessions")
        .select("logged_for_date")
        .eq("user_id", user.id)
        .gte("logged_for_date", dateKey(new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000))),
      supabase.from("trips").select("start_date, end_date").eq("user_id", user.id),
    ]);

    const sleepHours = (healthMetrics ?? []).map((h) => h.sleep_hours).filter((v): v is number => v !== null);
    const avgSleepHours = sleepHours.length > 0 ? sleepHours.reduce((a, b) => a + b, 0) / sleepHours.length : null;
    const exerciseDaysThisWeek = new Set(
      (healthMetrics ?? []).filter((h) => h.exercise_minutes && h.exercise_minutes > 0).map((h) => h.logged_for_date),
    ).size;
    const sortedWeights = (bodyMetrics ?? []).filter((m) => m.weight_kg !== null);
    const latestWeightKg = sortedWeights[0]?.weight_kg ?? null;
    const oldestWeightInWindow = sortedWeights[sortedWeights.length - 1]?.weight_kg ?? null;
    const weightChangeKg =
      latestWeightKg !== null && oldestWeightInWindow !== null && sortedWeights.length > 1
        ? Math.round((latestWeightKg - oldestWeightInWindow) * 10) / 10
        : null;

    const caloriesByDay = new Map<string, number>();
    for (const log of foodLogs ?? []) {
      const key = log.logged_at.slice(0, 10);
      caloriesByDay.set(key, (caloriesByDay.get(key) ?? 0) + log.calories);
    }
    const avgDailyCalories =
      caloriesByDay.size > 0
        ? Math.round([...caloriesByDay.values()].reduce((a, b) => a + b, 0) / caloriesByDay.size)
        : null;

    const spentThisMonth = (transactions ?? []).reduce((sum, t) => sum + t.amount, 0);
    const budgetLimit =
      (budgets ?? []).length > 0 ? (budgets ?? []).reduce((sum, b) => sum + b.monthly_limit, 0) : null;

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
    const activeGoals = (goals ?? []).filter((g) => g.status === "active");
    const goalProgressPcts = activeGoals.map((g) =>
      computeGoalProgressPct({
        targetValue: g.target_value,
        currentValue: g.current_value,
        manualProgressPct: g.manual_progress_pct,
        milestones: milestonesByGoal.get(g.id) ?? [],
      }),
    );
    const avgGoalProgressPct =
      goalProgressPcts.length > 0
        ? Math.round(goalProgressPcts.reduce((a, b) => a + b, 0) / goalProgressPcts.length)
        : null;
    const completedThisMonth = (goals ?? []).filter(
      (g) => g.completed_at && new Date(g.completed_at) >= monthStart,
    ).length;

    const moodValues = (moodLogs ?? []).map((m) => m.mood);
    const avgMoodThisWeek = moodValues.length > 0 ? moodValues.reduce((a, b) => a + b, 0) / moodValues.length : null;

    const longestStreak = habitsWithStreaks.reduce((max, h) => Math.max(max, h.streak), 0);

    const tasksCompletedThisWeek = (weekTasks ?? []).filter((t) => t.status === "completed").length;
    const tasksPlannedThisWeek = (weekTasks ?? []).length;
    const focusMinutesThisWeek = (weekFocusSessions ?? []).reduce(
      (sum, s) => sum + (s.actual_duration_minutes ?? 0),
      0,
    );

    const studyDates = new Set((studySessions ?? []).map((s) => s.logged_for_date));
    let studyStreakDays = 0;
    const cursor = new Date();
    while (studyDates.has(dateKey(cursor))) {
      studyStreakDays += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    const todayKey = dateKey(now);
    const upcomingTrips = (trips ?? []).filter((t) => t.end_date >= todayKey).length;
    const pastTrips = (trips ?? []).filter((t) => t.end_date < todayKey).length;

    return {
      data: {
        productivity: { tasksCompletedThisWeek, tasksPlannedThisWeek, focusMinutesThisWeek },
        health: { avgSleepHours, exerciseDaysThisWeek, latestWeightKg, weightChangeKg },
        nutrition: {
          avgDailyCalories,
          calorieGoal: nutritionSettings?.daily_calorie_goal ?? null,
          daysLoggedThisWeek: caloriesByDay.size,
        },
        finance: {
          spentThisMonth: Math.round(spentThisMonth * 100) / 100,
          budgetLimit,
          currency: financeSettings?.currency ?? "EUR",
        },
        goals: {
          activeCount: activeGoals.length,
          avgProgressPct: avgGoalProgressPct,
          completedThisMonth,
        },
        habits: { activeCount: habitsWithStreaks.length, longestStreak },
        mood: { avgMoodThisWeek: avgMoodThisWeek !== null ? Math.round(avgMoodThisWeek * 10) / 10 : null },
        learning: {
          activeCourses: (courses ?? []).length,
          dueFlashcards: (dueFlashcards ?? []).length,
          studyStreakDays,
        },
        travel: { upcomingTrips, pastTrips },
      },
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't load the analytics summary" };
  }
}

export interface ProductivityWeekBundle {
  productivityData: ProductivityPoint[];
  taskCompletionData: TaskCompletionPoint[];
  moodData: { label: string; avgMood: number | null }[];
}

/** The day-bucketed last-7-days charts for the Analytics Center's Productivity/Mood tabs — same bucketing the old standalone Stats page used. */
export async function getProductivityWeekBundle(): Promise<ActionResult<ProductivityWeekBundle>> {
  const { supabase, user } = await requireUser();

  try {
    const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", user.id).single();
    const timeZone = profile?.timezone ?? "UTC";
    const window = getStatsRangeWindow("week", timeZone);

    const [{ data: items }, { data: sessions }] = await Promise.all([
      supabase
        .from("schedule_items")
        .select("status, scheduled_start")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .gte("scheduled_start", window.start.toISOString())
        .lte("scheduled_start", window.end.toISOString()),
      supabase
        .from("focus_sessions")
        .select("started_at, actual_duration_minutes, planned_duration_minutes, mood_after")
        .eq("user_id", user.id)
        .gte("started_at", window.start.toISOString())
        .lte("started_at", window.end.toISOString()),
    ]);

    const productivityByBucket = new Map<string, number>();
    for (const session of sessions ?? []) {
      if (session.actual_duration_minutes === null) continue;
      const key = keyForInstant(new Date(session.started_at), timeZone, window.bucketUnit);
      productivityByBucket.set(key, (productivityByBucket.get(key) ?? 0) + session.actual_duration_minutes);
    }
    const productivityData: ProductivityPoint[] = window.bucketKeys.map((key) => ({
      key,
      label: window.labelForKey(key),
      productiveMinutes: productivityByBucket.get(key) ?? 0,
    }));

    const tasksByBucket = new Map<string, { planned: number; completed: number }>();
    for (const item of items ?? []) {
      if (!item.scheduled_start) continue;
      const key = keyForInstant(new Date(item.scheduled_start), timeZone, window.bucketUnit);
      const entry = tasksByBucket.get(key) ?? { planned: 0, completed: 0 };
      entry.planned += 1;
      if (item.status === "completed") entry.completed += 1;
      tasksByBucket.set(key, entry);
    }
    const taskCompletionData: TaskCompletionPoint[] = window.bucketKeys.map((key) => {
      const entry = tasksByBucket.get(key) ?? { planned: 0, completed: 0 };
      return { key, label: window.labelForKey(key), tasksPlanned: entry.planned, tasksCompleted: entry.completed };
    });

    const moodByBucket = new Map<string, number[]>();
    for (const session of sessions ?? []) {
      if (!session.mood_after) continue;
      const key = keyForInstant(new Date(session.started_at), timeZone, window.bucketUnit);
      if (!moodByBucket.has(key)) moodByBucket.set(key, []);
      moodByBucket.get(key)!.push(session.mood_after);
    }
    const moodData = window.bucketKeys.map((key) => {
      const moods = moodByBucket.get(key);
      return {
        label: window.labelForKey(key),
        avgMood: moods && moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : null,
      };
    });

    return { data: { productivityData, taskCompletionData, moodData } };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't load productivity data" };
  }
}
