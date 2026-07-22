import { NextResponse } from "next/server";
import { z } from "zod";

import { generateCoaching } from "@/lib/ai/generate-coaching";
import { getLocale } from "@/lib/i18n/get-locale";
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
  }

  try {
    const locale = await getLocale();
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
        title: "New AI Coach insight",
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
