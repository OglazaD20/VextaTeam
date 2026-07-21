import type { Metadata } from "next";
import Link from "next/link";

import { CoachPanel } from "@/components/coach/coach-panel";
import { HabitInsights } from "@/components/habits/habit-insights";
import { HabitStreakList } from "@/components/stats/habit-streak-list";
import { StatCard } from "@/components/stats/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_LABEL, CATEGORY_VAR } from "@/lib/scheduling/category-style";
import { getTodayRangeUtc } from "@/lib/scheduling/day-range";
import { getThisWeekRangeUtc } from "@/lib/scheduling/week-range";
import { getHabitsWithStreaks } from "@/lib/habits/get-habits-with-streaks";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard — LifeFlow" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone, full_name")
    .eq("id", user.id)
    .single();
  const timeZone = profile?.timezone ?? "UTC";

  const todayRange = getTodayRangeUtc(timeZone);
  const weekRange = getThisWeekRangeUtc(timeZone);

  const [
    { data: todayItems, error: todayError },
    { data: weekItems, error: weekError },
    { data: sessions, error: sessionsError },
    habitsWithStreaks,
  ] = await Promise.all([
    supabase
      .from("schedule_items")
      .select("id, title, type, status, scheduled_start, scheduled_end")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .is("archived_at", null)
      .gte("scheduled_start", todayRange.start.toISOString())
      .lte("scheduled_start", todayRange.end.toISOString())
      .order("scheduled_start", { ascending: true }),
    supabase
      .from("schedule_items")
      .select("status")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .gte("scheduled_start", weekRange.start.toISOString())
      .lte("scheduled_start", weekRange.end.toISOString()),
    supabase
      .from("focus_sessions")
      .select("actual_duration_minutes, planned_duration_minutes")
      .eq("user_id", user.id)
      .gte("started_at", weekRange.start.toISOString())
      .lte("started_at", weekRange.end.toISOString()),
    getHabitsWithStreaks(supabase, user.id, timeZone),
  ]);

  if (todayError) throw new Error(`Failed to load today's schedule: ${todayError.message}`);
  if (weekError) throw new Error(`Failed to load this week's tasks: ${weekError.message}`);
  if (sessionsError) {
    throw new Error(`Failed to load focus sessions: ${sessionsError.message}`);
  }

  const todayDone = (todayItems ?? []).filter((i) => i.status === "completed").length;
  const todayTotal = todayItems?.length ?? 0;
  const now = new Date();
  const nextUp = (todayItems ?? []).find(
    (i) => i.status !== "completed" && i.scheduled_start && new Date(i.scheduled_start) >= now,
  );

  const tasksPlanned = weekItems?.length ?? 0;
  const tasksCompleted = weekItems?.filter((i) => i.status === "completed").length ?? 0;

  const finishedSessions = (sessions ?? []).filter((s) => s.actual_duration_minutes !== null);
  const productiveMinutes = finishedSessions.reduce(
    (sum, s) => sum + (s.actual_duration_minutes ?? 0),
    0,
  );
  const plannedMinutes = finishedSessions.reduce((sum, s) => sum + s.planned_duration_minutes, 0);
  const focusScore =
    plannedMinutes > 0 ? Math.min(100, Math.round((productiveMinutes / plannedMinutes) * 100)) : null;

  const topStreaks = [...habitsWithStreaks]
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 5);

  const greetingName = profile?.full_name?.split(" ")[0];
  const todayLabel = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {greetingName ? `Welcome back, ${greetingName}` : "Welcome back"}
        </h1>
        <p className="text-sm text-muted-foreground">{todayLabel}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="glass-surface">
          <CardHeader>
            <CardTitle className="text-base">Today</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-2xl font-semibold">
              {todayDone}
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                / {todayTotal} done
              </span>
            </p>
            {nextUp ? (
              <div className="flex items-center gap-2 text-sm">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: CATEGORY_VAR[nextUp.type] }}
                />
                <span className="truncate">
                  Next: {nextUp.title} · {CATEGORY_LABEL[nextUp.type]}
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing else scheduled today.</p>
            )}
            <Button asChild size="sm" variant="outline" className="self-start">
              <Link href="/calendar/day/today">Open today&apos;s timeline</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-surface">
          <CardHeader>
            <CardTitle className="text-base">This week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              <StatCard label="Focus score" value={focusScore !== null ? String(focusScore) : "—"} />
              <StatCard label="Focused" value={`${(productiveMinutes / 60).toFixed(1)}h`} />
              <StatCard label="Tasks" value={`${tasksCompleted}/${tasksPlanned}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-surface">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Habit streaks</CardTitle>
          <Button asChild size="sm" variant="ghost">
            <Link href="/habits">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <HabitStreakList items={topStreaks} />
        </CardContent>
      </Card>

      <Card className="glass-surface">
        <CardHeader>
          <CardTitle className="text-base">AI Coach</CardTitle>
        </CardHeader>
        <CardContent>
          <CoachPanel />
        </CardContent>
      </Card>

      <Card className="glass-surface">
        <CardHeader>
          <CardTitle className="text-base">Habit tips</CardTitle>
        </CardHeader>
        <CardContent>
          <HabitInsights />
        </CardContent>
      </Card>
    </div>
  );
}
