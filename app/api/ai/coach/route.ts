import { NextResponse } from "next/server";
import { z } from "zod";

import { generateCoaching } from "@/lib/ai/generate-coaching";
import { getCurrentWeather, getHourlyForecast } from "@/lib/activities/weather-client";
import { computeWeatherSuggestions } from "@/lib/weather/planner";
import { computeBudgetUsage, computeCashFlow, computeSpendingByCategory } from "@/lib/finance/calculations";
import { ACHIEVEMENTS } from "@/lib/gamification/achievements";
import { computeGoalProgressPct } from "@/lib/goals/progress";
import { getDictionary } from "@/lib/i18n/get-locale";
import { isNotificationDueForFrequency, isNotificationEnabled } from "@/lib/notifications/preferences";
import { sendPushToUser } from "@/lib/notifications/push";
import {
  computeBurnoutSignal,
  computeHydrationTimingSignal,
  computeLongestHabitStreak,
  computeSleepProductivitySignal,
  computeTaskCompletionSignal,
  computeWeakestExerciseWeekday,
  computeWeightTrend,
} from "@/lib/coach/signals";
import { getHabitsWithStreaks } from "@/lib/habits/get-habits-with-streaks";
import {
  computeMoodByWeekday,
  computeMoodSleepCorrelation,
  computeMoodTrend,
} from "@/lib/mood/signals";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({ period: z.enum(["daily", "weekly", "monthly"]) });
const periodEnum = z.enum(["daily", "weekly", "monthly"]);

const PERIOD_DAYS: Record<string, number> = { daily: 1, weekly: 7, monthly: 30 };

function dateKeyOf(iso: string): string {
  return iso.slice(0, 10);
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsedPeriod = periodEnum.safeParse(searchParams.get("period") ?? "daily");
  const period = parsedPeriod.success ? parsedPeriod.data : "daily";

  const { data, error } = await supabase
    .from("coach_insights")
    .select("headline, insights, created_at")
    .eq("user_id", user.id)
    .eq("period", period)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { period } = parsed.data;
  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();
  const timeZone = profile?.timezone ?? "UTC";

  const days = PERIOD_DAYS[period];
  const now = new Date();
  const periodStart = new Date(now.getTime() - days * 86_400_000);
  const priorStart = new Date(now.getTime() - days * 2 * 86_400_000);

  const [
    { data: recentTasks, error: tasksError },
    { data: priorTasks },
    { data: focusSessions, error: focusError },
    { data: recentHealth, error: healthError },
    { data: priorHealth },
    { data: waterLogs, error: waterError },
    { data: bodyMetrics, error: bodyError },
    { data: moodLogs, error: moodError },
  ] = await Promise.all([
    supabase
      .from("schedule_items")
      .select("status, priority, scheduled_start")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .gte("scheduled_start", periodStart.toISOString())
      .lte("scheduled_start", now.toISOString()),
    supabase
      .from("schedule_items")
      .select("status, priority, scheduled_start")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .gte("scheduled_start", priorStart.toISOString())
      .lt("scheduled_start", periodStart.toISOString()),
    supabase
      .from("focus_sessions")
      .select("started_at, actual_duration_minutes, planned_duration_minutes, mood_after")
      .eq("user_id", user.id)
      .gte("started_at", periodStart.toISOString())
      .lte("started_at", now.toISOString()),
    supabase
      .from("health_metrics")
      .select("logged_for_date, sleep_hours, exercise_minutes")
      .eq("user_id", user.id)
      .gte("logged_for_date", periodStart.toISOString().slice(0, 10)),
    supabase
      .from("health_metrics")
      .select("logged_for_date, sleep_hours, exercise_minutes")
      .eq("user_id", user.id)
      .gte("logged_for_date", priorStart.toISOString().slice(0, 10))
      .lt("logged_for_date", periodStart.toISOString().slice(0, 10)),
    supabase
      .from("water_logs")
      .select("logged_at")
      .eq("user_id", user.id)
      .gte("logged_at", periodStart.toISOString()),
    supabase
      .from("body_metrics")
      .select("logged_for_date, weight_kg")
      .eq("user_id", user.id)
      .gte("logged_for_date", periodStart.toISOString().slice(0, 10))
      .order("logged_for_date", { ascending: true }),
    supabase
      .from("mood_logs")
      .select("logged_at, logged_for_date, mood, stress, energy")
      .eq("user_id", user.id)
      .gte("logged_at", periodStart.toISOString()),
  ]);

  if (tasksError || focusError || healthError || waterError || bodyError || moodError) {
    return NextResponse.json(
      {
        error:
          (tasksError ?? focusError ?? healthError ?? waterError ?? bodyError ?? moodError)?.message ??
          "Failed to load data",
      },
      { status: 500 },
    );
  }

  const taskRecords = (recentTasks ?? []).map((t) => ({
    status: t.status,
    priority: t.priority,
    scheduledStart: t.scheduled_start,
  }));
  const healthRecords = (recentHealth ?? []).map((h) => ({
    dateKey: h.logged_for_date,
    sleepHours: h.sleep_hours,
    exerciseMinutes: h.exercise_minutes,
  }));
  const focusRecords = (focusSessions ?? []).map((f) => ({
    dateKey: dateKeyOf(f.started_at),
    actualMinutes: f.actual_duration_minutes,
    plannedMinutes: f.planned_duration_minutes,
    moodAfter: f.mood_after,
  }));

  const habitsWithStreaks = await getHabitsWithStreaks(supabase, user.id, timeZone);

  const moodRecords = (moodLogs ?? []).map((m) => ({
    loggedAt: m.logged_at,
    mood: m.mood,
    stress: m.stress,
    energy: m.energy,
  }));
  const sleepByDate = new Map(
    healthRecords.filter((h) => h.sleepHours !== null).map((h) => [h.dateKey, h.sleepHours!]),
  );

  const signals: Record<string, unknown> = {
    period,
    taskCompletion: computeTaskCompletionSignal(taskRecords, timeZone),
    sleepProductivity: computeSleepProductivitySignal(healthRecords, focusRecords),
    weakestExerciseWeekday: computeWeakestExerciseWeekday(healthRecords, timeZone),
    hydrationTiming: computeHydrationTimingSignal(
      (waterLogs ?? []).map((w) => ({ loggedAt: w.logged_at })),
      timeZone,
    ),
    weightTrend: computeWeightTrend(
      (bodyMetrics ?? []).map((m) => ({ dateKey: m.logged_for_date, weightKg: m.weight_kg })),
    ),
    longestHabitStreak: computeLongestHabitStreak(
      habitsWithStreaks.map((h) => ({ name: h.habit.name, streak: h.streak })),
    ),
    moodTrend: computeMoodTrend(moodRecords),
    moodByWeekday: computeMoodByWeekday(moodRecords, timeZone),
    moodSleepCorrelation: computeMoodSleepCorrelation(
      (moodLogs ?? []).map((m) => ({ dateKey: m.logged_for_date, mood: m.mood })),
      sleepByDate,
    ),
  };

  if (period !== "daily") {
    signals.burnout = computeBurnoutSignal(
      { recent: taskRecords, prior: (priorTasks ?? []).map((t) => ({ status: t.status, priority: t.priority, scheduledStart: t.scheduled_start })) },
      { recent: healthRecords, prior: (priorHealth ?? []).map((h) => ({ dateKey: h.logged_for_date, sleepHours: h.sleep_hours, exerciseMinutes: h.exercise_minutes })) },
    );

    // Weekly/monthly reviews additionally cover finance, goals, nutrition,
    // and achievements — real per-period aggregates only, best-effort so a
    // failure in any one slice never blocks the rest of the review.
    const [
      { data: transactions },
      { data: budgets },
      { data: goals },
      { data: foodLogs },
      { data: nutritionSettings },
      { data: unlockedAchievements },
    ] = await Promise.all([
      supabase
        .from("transactions")
        .select("type, amount, category, occurred_at")
        .eq("user_id", user.id)
        .gte("occurred_at", periodStart.toISOString())
        .lte("occurred_at", now.toISOString()),
      supabase.from("finance_budgets").select("category, monthly_limit").eq("user_id", user.id),
      supabase.from("goals").select("*").eq("user_id", user.id).eq("status", "active"),
      supabase
        .from("food_logs")
        .select("logged_at, calories")
        .eq("user_id", user.id)
        .gte("logged_at", periodStart.toISOString())
        .lte("logged_at", now.toISOString()),
      supabase.from("nutrition_settings").select("daily_calorie_goal").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("user_achievements")
        .select("achievement_id, unlocked_at")
        .eq("user_id", user.id)
        .gte("unlocked_at", periodStart.toISOString())
        .lte("unlocked_at", now.toISOString()),
    ]);

    const { data: milestones } =
      (goals ?? []).length > 0
        ? await supabase
            .from("goal_milestones")
            .select("goal_id, is_completed")
            .in(
              "goal_id",
              (goals ?? []).map((g) => g.id),
            )
        : { data: [] as { goal_id: string; is_completed: boolean }[] };

    const txRecords = (transactions ?? []).map((t) => ({
      type: t.type,
      amount: t.amount,
      category: t.category,
      occurredAt: t.occurred_at,
    }));
    const cashFlow = computeCashFlow(txRecords);
    const spendingByCategory = computeSpendingByCategory(txRecords);
    const budgetUsage = computeBudgetUsage(
      (budgets ?? []).map((b) => ({ category: b.category, monthlyLimit: b.monthly_limit })),
      spendingByCategory,
    );
    signals.finance = {
      income: cashFlow.income,
      expenses: cashFlow.expenses,
      net: cashFlow.net,
      overBudgetCategories: budgetUsage.filter((b) => b.isOverBudget).map((b) => b.category),
    };

    const milestonesByGoal = new Map<string, { isCompleted: boolean }[]>();
    for (const m of milestones ?? []) {
      if (!milestonesByGoal.has(m.goal_id)) milestonesByGoal.set(m.goal_id, []);
      milestonesByGoal.get(m.goal_id)!.push({ isCompleted: m.is_completed });
    }
    signals.goals = {
      activeGoals: (goals ?? []).map((g) => ({
        title: g.title,
        progressPct: computeGoalProgressPct({
          targetValue: g.target_value,
          currentValue: g.current_value,
          manualProgressPct: g.manual_progress_pct,
          milestones: milestonesByGoal.get(g.id) ?? [],
        }),
      })),
    };

    const daysInPeriod = Math.max(1, Math.round((now.getTime() - periodStart.getTime()) / 86_400_000));
    const totalCalories = (foodLogs ?? []).reduce((sum, f) => sum + f.calories, 0);
    const daysLogged = new Set((foodLogs ?? []).map((f) => dateKeyOf(f.logged_at))).size;
    signals.nutrition =
      daysLogged > 0
        ? {
            avgCaloriesPerDayLogged: Math.round(totalCalories / daysLogged),
            calorieGoal: nutritionSettings?.daily_calorie_goal ?? null,
            daysLogged,
            daysInPeriod,
          }
        : null;

    const achievementTitleById = new Map(ACHIEVEMENTS.map((a) => [a.id, a.title]));
    const unlockedTitles = (unlockedAchievements ?? [])
      .map((u) => achievementTitleById.get(u.achievement_id))
      .filter((title): title is string => Boolean(title));
    signals.achievements = unlockedTitles.length > 0 ? { unlockedCount: unlockedTitles.length, titles: unlockedTitles } : null;
  }

  // Weather only matters for "right now" coaching — best-effort, silently
  // skipped if there's no saved location or the weather API is unreachable.
  if (period === "daily") {
    try {
      const { data: locationSettings } = await supabase
        .from("user_settings")
        .select("default_lat, default_lng")
        .eq("user_id", user.id)
        .maybeSingle();

      if (locationSettings?.default_lat != null && locationSettings?.default_lng != null) {
        const location = { lat: locationSettings.default_lat, lng: locationSettings.default_lng };
        const [current, forecast] = await Promise.all([
          getCurrentWeather(location),
          getHourlyForecast(location).catch(() => []),
        ]);
        signals.weather = {
          tempC: current.tempC,
          condition: current.condition,
          isRaining: current.isRaining,
          windKph: current.windKph,
          suggestions: computeWeatherSuggestions(current, forecast).map((s) => s.message),
        };
      }
    } catch {
      // No weather signal today — the coach just won't reference it.
    }
  }

  try {
    const { locale, t } = await getDictionary();
    const result = await generateCoaching({ period, ...signals }, locale);

    await supabase.from("coach_insights").insert({
      user_id: user.id,
      period,
      headline: result.headline,
      insights: result.insights,
      signals,
    });

    const { data: notifSettings } = await supabase
      .from("user_settings")
      .select("notification_prefs, reminder_frequency")
      .eq("user_id", user.id)
      .maybeSingle();
    if (
      isNotificationEnabled(notifSettings?.notification_prefs, "coach_suggestion") &&
      isNotificationDueForFrequency("coach_suggestion", notifSettings?.reminder_frequency)
    ) {
      await sendPushToUser(supabase, user.id, timeZone, {
        title: t.notifications.newCoachInsightTitle,
        body: result.headline,
      });
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI coach failed" },
      { status: 502 },
    );
  }
}
