import type { Metadata } from "next";
import { format } from "date-fns";

import { HabitInsights } from "@/components/habits/habit-insights";
import { HabitStreakList } from "@/components/stats/habit-streak-list";
import { MoodTrend } from "@/components/stats/mood-trend";
import { ProductivityChart, type ProductivityPoint } from "@/components/stats/productivity-chart";
import { RangeTabs } from "@/components/stats/range-tabs";
import { StatCard } from "@/components/stats/stat-card";
import {
  TaskCompletionChart,
  type TaskCompletionPoint,
} from "@/components/stats/task-completion-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getHabitsWithStreaks } from "@/lib/habits/get-habits-with-streaks";
import { getStatsRangeWindow, keyForInstant, type StatsRange } from "@/lib/stats/bucket-range";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Stats — LifeFlow" };

function parseRange(value: string | undefined): StatsRange {
  return value === "month" || value === "year" ? value : "week";
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeParam } = await searchParams;
  const range = parseRange(rangeParam);

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
  const window = getStatsRangeWindow(range, timeZone);

  const [{ data: items, error: itemsError }, { data: sessions, error: sessionsError }] =
    await Promise.all([
      supabase
        .from("schedule_items")
        .select("status, type, scheduled_start")
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

  const productivityByBucket = new Map<string, number>();
  for (const session of finishedSessions) {
    const key = keyForInstant(new Date(session.started_at), timeZone, window.bucketUnit);
    productivityByBucket.set(
      key,
      (productivityByBucket.get(key) ?? 0) + (session.actual_duration_minutes ?? 0),
    );
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
    return {
      key,
      label: window.labelForKey(key),
      tasksPlanned: entry.planned,
      tasksCompleted: entry.completed,
    };
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

  const rangeLabel =
    range === "week"
      ? "Last 7 days"
      : range === "month"
        ? "Last 30 days"
        : "Last 12 months";

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Stats</h1>
          <p className="text-sm text-muted-foreground">
            {rangeLabel} · {format(window.start, "MMM d")} – {format(window.end, "MMM d")}
          </p>
        </div>
        <RangeTabs active={range} />
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
          <CardTitle className="text-base">Productive time</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductivityChart data={productivityData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Task completion</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskCompletionChart data={taskCompletionData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mood trend</CardTitle>
          <CardDescription>Logged after focus sessions.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <MoodTrend days={moodData} />
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
        </CardHeader>
        <CardContent>
          <HabitInsights />
        </CardContent>
      </Card>
    </div>
  );
}
