import type { Metadata } from "next";
import Link from "next/link";
import { addDays, subDays } from "date-fns";

import { AfternoonSection } from "@/components/dashboard/afternoon-section";
import { EveningSection } from "@/components/dashboard/evening-section";
import { MorningSection } from "@/components/dashboard/morning-section";
import { CoachPanel } from "@/components/coach/coach-panel";
import { HabitInsights } from "@/components/habits/habit-insights";
import { LearningTeaser } from "@/components/learn/learning-teaser";
import { PredictTeaser } from "@/components/predict/predict-teaser";
import { HabitStreakList } from "@/components/stats/habit-streak-list";
import { StatCard } from "@/components/stats/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFinanceDashboard } from "@/app/(app)/finance/actions";
import { getGoals } from "@/app/(app)/goals/actions";
import { getTimeOfDay } from "@/lib/dashboard/time-of-day";
import { motivationalQuoteForDate } from "@/lib/dashboard/motivational-quotes";
import { ACHIEVEMENTS } from "@/lib/gamification/achievements";
import { computeGoalProgressPct } from "@/lib/goals/progress";
import { getHabitsWithStreaks } from "@/lib/habits/get-habits-with-streaks";
import { getTodayKey } from "@/lib/habits/today-key";
import { getDayRangeUtc, getTodayRangeUtc } from "@/lib/scheduling/day-range";
import { getThisWeekRangeUtc } from "@/lib/scheduling/week-range";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard — LifeFlow" };

const GREETING: Record<"morning" | "afternoon" | "evening", string> = {
  morning: "Good morning",
  afternoon: "Good afternoon",
  evening: "Good evening",
};

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
  const now = new Date();
  const timeOfDay = getTimeOfDay(timeZone, now);

  const todayRange = getTodayRangeUtc(timeZone, now);
  const todayKey = getTodayKey(timeZone, now);
  const weekRange = getThisWeekRangeUtc(timeZone);

  const [
    { data: todayItems, error: todayError },
    { data: weekItems, error: weekError },
    { data: sessions, error: sessionsError },
    habitsWithStreaks,
    { data: predictions },
    { data: dueFlashcards },
    { data: upcomingExamCourses },
  ] = await Promise.all([
    supabase
      .from("schedule_items")
      .select("id, title, type, status, priority, scheduled_start, scheduled_end, location")
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
    supabase
      .from("ai_predictions")
      .select("*")
      .eq("user_id", user.id)
      .order("confidence_pct", { ascending: false })
      .limit(2),
    supabase.from("flashcards").select("id").lte("due_at", new Date().toISOString()),
    supabase
      .from("courses")
      .select("title, exam_date")
      .eq("user_id", user.id)
      .eq("status", "active")
      .not("exam_date", "is", null)
      .gte("exam_date", new Date().toISOString().slice(0, 10))
      .order("exam_date", { ascending: true })
      .limit(1),
  ]);

  if (todayError) throw new Error(`Failed to load today's schedule: ${todayError.message}`);
  if (weekError) throw new Error(`Failed to load this week's tasks: ${weekError.message}`);
  if (sessionsError) {
    throw new Error(`Failed to load focus sessions: ${sessionsError.message}`);
  }

  const items = todayItems ?? [];
  const todayDone = items.filter((i) => i.status === "completed").length;
  const todayTotal = items.length;
  const nextUp = items.find(
    (i) => i.status !== "completed" && i.scheduled_start && new Date(i.scheduled_start) >= now,
  );
  const remainingItems = items.filter((i) => i.status !== "completed");

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

  // ---- Time-of-day-specific data ----
  let timeOfDayContent: React.ReactNode = null;

  if (timeOfDay === "morning") {
    const yesterdayKey = getTodayKey(timeZone, subDays(now, 1));
    const [{ data: yesterdayHealth }, { data: waterLogs }, { data: nutritionSettings }] = await Promise.all([
      supabase
        .from("health_metrics")
        .select("sleep_hours")
        .eq("user_id", user.id)
        .eq("logged_for_date", yesterdayKey)
        .maybeSingle(),
      supabase
        .from("water_logs")
        .select("amount_ml")
        .eq("user_id", user.id)
        .gte("logged_at", todayRange.start.toISOString())
        .lte("logged_at", todayRange.end.toISOString()),
      supabase.from("nutrition_settings").select("water_goal_ml").eq("user_id", user.id).maybeSingle(),
    ]);

    const priorities = [...remainingItems]
      .sort((a, b) => b.priority - a.priority || (a.scheduled_start ?? "").localeCompare(b.scheduled_start ?? ""))
      .slice(0, 4);
    const travelReminders = items.filter((i) => i.location);
    const waterMl = (waterLogs ?? []).reduce((sum, w) => sum + w.amount_ml, 0);

    timeOfDayContent = (
      <MorningSection
        firstEvent={items[0] ?? null}
        priorities={priorities}
        travelReminders={travelReminders}
        sleepHours={yesterdayHealth?.sleep_hours ?? null}
        waterMl={waterMl}
        waterGoalMl={nutritionSettings?.water_goal_ml ?? 2000}
        motivationalQuote={motivationalQuoteForDate(todayKey)}
      />
    );
  } else if (timeOfDay === "afternoon") {
    const [{ data: foodLogs }, { data: healthToday }, { data: waterLogs }, { data: nutritionSettings }, financeResult] =
      await Promise.all([
        supabase
          .from("food_logs")
          .select("calories")
          .eq("user_id", user.id)
          .gte("logged_at", todayRange.start.toISOString())
          .lte("logged_at", todayRange.end.toISOString()),
        supabase
          .from("health_metrics")
          .select("steps, exercise_minutes")
          .eq("user_id", user.id)
          .eq("logged_for_date", todayKey)
          .maybeSingle(),
        supabase
          .from("water_logs")
          .select("amount_ml")
          .eq("user_id", user.id)
          .gte("logged_at", todayRange.start.toISOString())
          .lte("logged_at", todayRange.end.toISOString()),
        supabase
          .from("nutrition_settings")
          .select("water_goal_ml, daily_calorie_goal")
          .eq("user_id", user.id)
          .maybeSingle(),
        getFinanceDashboard(),
      ]);

    const caloriesConsumed = (foodLogs ?? []).reduce((sum, f) => sum + f.calories, 0);
    const waterMl = (waterLogs ?? []).reduce((sum, w) => sum + w.amount_ml, 0);

    timeOfDayContent = (
      <AfternoonSection
        remainingTasks={remainingItems}
        caloriesConsumed={Math.round(caloriesConsumed)}
        calorieGoal={nutritionSettings?.daily_calorie_goal ?? 0}
        steps={healthToday?.steps ?? null}
        waterMl={waterMl}
        waterGoalMl={nutritionSettings?.water_goal_ml ?? 2000}
        hasLoggedWorkoutToday={Boolean(healthToday?.exercise_minutes)}
        budgetUsage={financeResult.data?.budgetUsage ?? []}
      />
    );
  } else {
    const tomorrowKey = getTodayKey(timeZone, addDays(now, 1));
    const tomorrowRange = getDayRangeUtc(timeZone, tomorrowKey);

    const [{ data: foodLogs }, { data: nutritionSettings }, { data: unlockedToday }, { data: tomorrowItems }, goalsResult] =
      await Promise.all([
        supabase
          .from("food_logs")
          .select("calories")
          .eq("user_id", user.id)
          .gte("logged_at", todayRange.start.toISOString())
          .lte("logged_at", todayRange.end.toISOString()),
        supabase.from("nutrition_settings").select("daily_calorie_goal").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("user_achievements")
          .select("achievement_id, unlocked_at")
          .eq("user_id", user.id)
          .gte("unlocked_at", todayRange.start.toISOString())
          .lte("unlocked_at", todayRange.end.toISOString()),
        supabase
          .from("schedule_items")
          .select("id, title, type, scheduled_start")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .is("archived_at", null)
          .gte("scheduled_start", tomorrowRange.start.toISOString())
          .lte("scheduled_start", tomorrowRange.end.toISOString())
          .order("scheduled_start", { ascending: true })
          .limit(4),
        getGoals(),
      ]);

    const achievementDefsById = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
    const achievementsToday = (unlockedToday ?? [])
      .map((u) => achievementDefsById.get(u.achievement_id))
      .filter((a): a is (typeof ACHIEVEMENTS)[number] => Boolean(a))
      .map((a) => ({ id: a.id, title: a.title, tier: a.tier }));

    const activeGoals = (goalsResult.data ?? []).filter((g) => g.status === "active");
    const goalsProgress = activeGoals
      .map((g) => ({
        id: g.id,
        title: g.title,
        pct: computeGoalProgressPct({
          targetValue: g.target_value,
          currentValue: g.current_value,
          manualProgressPct: g.manual_progress_pct,
          milestones: g.milestones.map((m) => ({ isCompleted: m.is_completed })),
        }),
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 3);

    const caloriesConsumed = (foodLogs ?? []).reduce((sum, f) => sum + f.calories, 0);

    timeOfDayContent = (
      <EveningSection
        completedToday={todayDone}
        totalToday={todayTotal}
        achievementsToday={achievementsToday}
        caloriesConsumed={Math.round(caloriesConsumed)}
        calorieGoal={nutritionSettings?.daily_calorie_goal ?? 0}
        tomorrowPreview={tomorrowItems ?? []}
        goalsProgress={goalsProgress}
      />
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {greetingName ? `${GREETING[timeOfDay]}, ${greetingName}` : GREETING[timeOfDay]}
        </h1>
        <p className="text-sm text-muted-foreground">{todayLabel}</p>
      </div>

      {timeOfDayContent}

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
              <p className="truncate text-sm text-muted-foreground">Next: {nextUp.title}</p>
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

      <Card className="glass-surface">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">AI Predict</CardTitle>
          <Button asChild size="sm" variant="ghost">
            <Link href="/predict">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <PredictTeaser predictions={predictions ?? []} />
        </CardContent>
      </Card>

      <Card className="glass-surface">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Learning Hub</CardTitle>
          <Button asChild size="sm" variant="ghost">
            <Link href="/learn">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <LearningTeaser
            dueFlashcardCount={dueFlashcards?.length ?? 0}
            nearestExam={
              upcomingExamCourses?.[0]
                ? { title: upcomingExamCourses[0].title, examDate: upcomingExamCourses[0].exam_date! }
                : null
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
