import type { Metadata } from "next";
import { addDays, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

import { HabitStreakList } from "@/components/stats/habit-streak-list";
import { MoodTrend } from "@/components/stats/mood-trend";
import { StatCard } from "@/components/stats/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getHabitsWithStreaks } from "@/lib/habits/get-habits-with-streaks";
import { getThisWeekRangeUtc } from "@/lib/scheduling/week-range";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Stats — LifeFlow" };

export default async function StatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();

  const timeZone = profile?.timezone ?? "UTC";
  const { start, end } = getThisWeekRangeUtc(timeZone);

  const [{ data: items, error: itemsError }, { data: sessions, error: sessionsError }] =
    await Promise.all([
      supabase
        .from("schedule_items")
        .select("status, type")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .gte("scheduled_start", start.toISOString())
        .lte("scheduled_start", end.toISOString()),
      supabase
        .from("focus_sessions")
        .select("started_at, actual_duration_minutes, planned_duration_minutes, mood_after")
        .eq("user_id", user.id)
        .gte("started_at", start.toISOString())
        .lte("started_at", end.toISOString()),
    ]);

  if (itemsError) throw new Error(`Failed to load tasks: ${itemsError.message}`);
  if (sessionsError) throw new Error(`Failed to load focus sessions: ${sessionsError.message}`);

  const habitsWithStreaks = await getHabitsWithStreaks(supabase, user.id, timeZone);

  const tasksPlanned = items?.length ?? 0;
  const tasksCompleted = items?.filter((item) => item.status === "completed").length ?? 0;

  const finishedSessions = (sessions ?? []).filter((s) => s.actual_duration_minutes !== null);
  const productiveMinutes = finishedSessions.reduce(
    (sum, s) => sum + (s.actual_duration_minutes ?? 0),
    0,
  );
  const plannedMinutes = finishedSessions.reduce(
    (sum, s) => sum + s.planned_duration_minutes,
    0,
  );
  const focusScore =
    plannedMinutes > 0
      ? Math.min(100, Math.round((productiveMinutes / plannedMinutes) * 100))
      : null;

  const weekStartInZone = toZonedTime(start, timeZone);
  const moodByDay = new Map<string, number[]>();
  for (const session of sessions ?? []) {
    if (!session.mood_after) continue;
    const dayKey = format(toZonedTime(new Date(session.started_at), timeZone), "yyyy-MM-dd");
    if (!moodByDay.has(dayKey)) moodByDay.set(dayKey, []);
    moodByDay.get(dayKey)!.push(session.mood_after);
  }

  const moodDays = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStartInZone, i);
    const dayKey = format(day, "yyyy-MM-dd");
    const moods = moodByDay.get(dayKey);
    return {
      label: format(day, "EEE"),
      avgMood: moods && moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : null,
    };
  });

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">This week</h1>
        <p className="text-sm text-muted-foreground">
          {format(start, "MMM d")} – {format(end, "MMM d")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Focus score"
          value={focusScore !== null ? String(focusScore) : "—"}
        />
        <StatCard
          label="Productive time"
          value={`${(productiveMinutes / 60).toFixed(1)}h`}
        />
        <StatCard
          label="Tasks done"
          value={`${tasksCompleted}/${tasksPlanned}`}
        />
        <StatCard
          label="Focus sessions"
          value={String(sessions?.length ?? 0)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mood trend</CardTitle>
          <CardDescription>Logged after focus sessions.</CardDescription>
        </CardHeader>
        <CardContent>
          <MoodTrend days={moodDays} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Habit streaks</CardTitle>
        </CardHeader>
        <CardContent>
          <HabitStreakList items={habitsWithStreaks} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI recommendations</CardTitle>
          <CardDescription>
            Arrives once the AI planning engine ships — this week&apos;s data is
            already being collected for it.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
