import { endOfWeek, startOfWeek } from "date-fns";
import { NextResponse } from "next/server";

import {
  generatePredictions,
  type PredictionCategory,
  type PredictionSignalInput,
} from "@/lib/ai/generate-predictions";
import { getLocale } from "@/lib/i18n/get-locale";
import {
  computeBurnoutSignal,
  computeSleepProductivitySignal,
  computeWeakestExerciseWeekday,
} from "@/lib/coach/signals";
import { computeSpendingByCategory } from "@/lib/finance/calculations";
import { computeGoalProgressPct } from "@/lib/goals/progress";
import {
  computeBudgetForecast,
  computeGoalForecast,
  computeHabitMissRisk,
  computeWeightProjection,
} from "@/lib/predict/signals";
import { createClient } from "@/lib/supabase/server";

function dateKeyOf(iso: string): string {
  return iso.slice(0, 10);
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("ai_predictions")
    .select("*")
    .eq("user_id", user.id)
    .order("confidence_pct", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();
  const timeZone = profile?.timezone ?? "UTC";

  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86_400_000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86_400_000);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const daysInMonth = monthEnd.getDate();
  const dayOfMonth = now.getDate();

  const { data: activeGoals } = await supabase
    .from("goals")
    .select("id, title, created_at, deadline, target_value, current_value, manual_progress_pct")
    .eq("user_id", user.id)
    .eq("status", "active")
    .not("deadline", "is", null);
  const goalIds = (activeGoals ?? []).map((g) => g.id);

  const [
    { data: milestoneRows },
    { data: bodyMetrics },
    { data: habits },
    { data: habitLogs },
    { data: recentHealth },
    { data: priorHealth },
    { data: recentTasks },
    { data: priorTasks },
    { data: focusSessions },
    { data: transactions },
    { data: budgets },
  ] = await Promise.all([
    goalIds.length > 0
      ? supabase.from("goal_milestones").select("goal_id, is_completed").in("goal_id", goalIds)
      : Promise.resolve({ data: [] as { goal_id: string; is_completed: boolean }[] }),
    supabase
      .from("body_metrics")
      .select("logged_for_date, weight_kg")
      .eq("user_id", user.id)
      .gte("logged_for_date", ninetyDaysAgo.toISOString().slice(0, 10))
      .order("logged_for_date", { ascending: true }),
    supabase.from("habits").select("id, name, cadence, target_value").eq("user_id", user.id).eq("is_active", true),
    supabase
      .from("habit_logs")
      .select("habit_id, logged_for_date, completed")
      .eq("user_id", user.id)
      .gte("logged_for_date", weekStart.toISOString().slice(0, 10))
      .lte("logged_for_date", weekEnd.toISOString().slice(0, 10))
      .eq("completed", true),
    supabase
      .from("health_metrics")
      .select("logged_for_date, sleep_hours, exercise_minutes")
      .eq("user_id", user.id)
      .gte("logged_for_date", thirtyDaysAgo.toISOString().slice(0, 10)),
    supabase
      .from("health_metrics")
      .select("logged_for_date, sleep_hours, exercise_minutes")
      .eq("user_id", user.id)
      .gte("logged_for_date", sixtyDaysAgo.toISOString().slice(0, 10))
      .lt("logged_for_date", thirtyDaysAgo.toISOString().slice(0, 10)),
    supabase
      .from("schedule_items")
      .select("status, priority, scheduled_start")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .gte("scheduled_start", thirtyDaysAgo.toISOString())
      .lte("scheduled_start", now.toISOString()),
    supabase
      .from("schedule_items")
      .select("status, priority, scheduled_start")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .gte("scheduled_start", sixtyDaysAgo.toISOString())
      .lt("scheduled_start", thirtyDaysAgo.toISOString()),
    supabase
      .from("focus_sessions")
      .select("started_at, actual_duration_minutes, planned_duration_minutes, mood_after")
      .eq("user_id", user.id)
      .gte("started_at", thirtyDaysAgo.toISOString()),
    supabase
      .from("transactions")
      .select("type, amount, category, occurred_at")
      .eq("user_id", user.id)
      .eq("type", "expense")
      .gte("occurred_at", monthStart.toISOString())
      .lte("occurred_at", monthEnd.toISOString()),
    supabase.from("finance_budgets").select("category, monthly_limit").eq("user_id", user.id),
  ]);

  const signals: PredictionSignalInput[] = [];

  // Goal forecasts.
  const milestonesByGoal = new Map<string, { isCompleted: boolean }[]>();
  for (const row of milestoneRows ?? []) {
    const list = milestonesByGoal.get(row.goal_id) ?? [];
    list.push({ isCompleted: row.is_completed });
    milestonesByGoal.set(row.goal_id, list);
  }
  for (const goal of activeGoals ?? []) {
    if (!goal.deadline) continue;
    const progressPct = computeGoalProgressPct({
      targetValue: goal.target_value,
      currentValue: goal.current_value,
      manualProgressPct: goal.manual_progress_pct,
      milestones: milestonesByGoal.get(goal.id) ?? [],
    });
    const forecast = computeGoalForecast({
      id: goal.id,
      title: goal.title,
      createdAt: new Date(goal.created_at),
      deadline: new Date(`${goal.deadline}T23:59:59`),
      progressPct,
    });
    if (forecast) {
      signals.push({
        category: "goal",
        confidencePct: forecast.confidencePct,
        relatedEntityType: "goal",
        relatedEntityId: goal.id,
        data: { goalTitle: forecast.goalTitle, progressPct: forecast.progressPct, paceRatio: forecast.paceRatio, daysRemaining: forecast.daysRemaining, onTrack: forecast.onTrack },
      });
    }
  }

  // Weight projection.
  const weightProjection = computeWeightProjection(
    (bodyMetrics ?? []).map((m) => ({ dateKey: m.logged_for_date, weightKg: m.weight_kg })),
  );
  if (weightProjection) {
    signals.push({
      category: "health",
      confidencePct: weightProjection.confidencePct,
      relatedEntityType: "body_metrics",
      data: {
        ratePerWeekKg: weightProjection.ratePerWeekKg,
        projectedChangeKg: weightProjection.projectedChangeKg,
        weeksAhead: weightProjection.weeksAhead,
      },
    });
  }

  // Habit miss risk (this week).
  const completionsByHabit = new Map<string, number>();
  for (const log of habitLogs ?? []) {
    completionsByHabit.set(log.habit_id, (completionsByHabit.get(log.habit_id) ?? 0) + 1);
  }
  const daysElapsedThisWeek = Math.min(
    7,
    Math.ceil((now.getTime() - weekStart.getTime()) / 86_400_000),
  );
  for (const habit of habits ?? []) {
    if (habit.cadence === "custom") continue;
    const targetPerWeek = habit.cadence === "daily" ? 7 : (habit.target_value ?? 1);
    const risk = computeHabitMissRisk({
      id: habit.id,
      name: habit.name,
      completionsThisPeriod: completionsByHabit.get(habit.id) ?? 0,
      targetPerPeriod: targetPerWeek,
      daysElapsedInPeriod: daysElapsedThisWeek,
      daysTotalInPeriod: 7,
    });
    if (risk) {
      signals.push({
        category: "habit",
        confidencePct: risk.confidencePct,
        relatedEntityType: "habit",
        relatedEntityId: habit.id,
        data: {
          habitName: risk.habitName,
          completionsThisWeek: risk.completionsThisPeriod,
          targetPerWeek: risk.targetPerPeriod,
          expectedByNow: risk.expectedByNow,
        },
      });
    }
  }

  // Weakest exercise weekday.
  const healthRecords = (recentHealth ?? []).map((h) => ({
    dateKey: h.logged_for_date,
    sleepHours: h.sleep_hours,
    exerciseMinutes: h.exercise_minutes,
  }));
  const weakestWeekday = computeWeakestExerciseWeekday(healthRecords, timeZone);
  if (weakestWeekday) {
    signals.push({
      category: "habit",
      confidencePct: Math.round(Math.min(90, Math.max(40, (1 - weakestWeekday.exerciseRate) * 100))),
      relatedEntityType: "exercise_pattern",
      data: { weekday: weakestWeekday.weekday, exerciseRate: weakestWeekday.exerciseRate },
    });
  }

  // Sleep vs productivity.
  const focusRecords = (focusSessions ?? []).map((f) => ({
    dateKey: dateKeyOf(f.started_at),
    actualMinutes: f.actual_duration_minutes,
    plannedMinutes: f.planned_duration_minutes,
    moodAfter: f.mood_after,
  }));
  const sleepProductivity = computeSleepProductivitySignal(healthRecords, focusRecords);
  if (sleepProductivity && sleepProductivity.percentDifference <= -10) {
    signals.push({
      category: "productivity",
      confidencePct: Math.round(Math.min(90, Math.max(45, Math.abs(sleepProductivity.percentDifference) + 30))),
      relatedEntityType: "sleep_pattern",
      data: {
        betterSleepFocusRatio: sleepProductivity.betterSleepAvgRatio,
        worseSleepFocusRatio: sleepProductivity.worseSleepAvgRatio,
        percentDifference: sleepProductivity.percentDifference,
      },
    });
  }

  // Burnout risk.
  const taskRecords = (recentTasks ?? []).map((t) => ({ status: t.status, priority: t.priority, scheduledStart: t.scheduled_start }));
  const priorTaskRecords = (priorTasks ?? []).map((t) => ({ status: t.status, priority: t.priority, scheduledStart: t.scheduled_start }));
  const priorHealthRecords = (priorHealth ?? []).map((h) => ({ dateKey: h.logged_for_date, sleepHours: h.sleep_hours, exerciseMinutes: h.exercise_minutes }));
  const burnout = computeBurnoutSignal(
    { recent: taskRecords, prior: priorTaskRecords },
    { recent: healthRecords, prior: priorHealthRecords },
  );
  if (burnout) {
    const completionDrop = burnout.priorCompletionRate - burnout.recentCompletionRate;
    signals.push({
      category: "productivity",
      confidencePct: Math.round(Math.min(90, Math.max(45, completionDrop * 150 + 40))),
      relatedEntityType: "burnout_risk",
      data: { ...burnout },
    });
  }

  // Budget forecasts, per category with a set budget.
  const spendingByCategory = computeSpendingByCategory(
    (transactions ?? []).map((t) => ({ type: t.type, amount: t.amount, category: t.category, occurredAt: t.occurred_at })),
  );
  for (const budget of budgets ?? []) {
    const spentSoFar = spendingByCategory[budget.category] ?? 0;
    const forecast = computeBudgetForecast(budget.category, budget.monthly_limit, spentSoFar, dayOfMonth, daysInMonth);
    if (forecast) {
      signals.push({
        category: "finance",
        confidencePct: forecast.confidencePct,
        relatedEntityType: "budget_category",
        data: { ...forecast },
      });
    }
  }

  if (signals.length === 0) {
    await supabase.from("ai_predictions").delete().eq("user_id", user.id);
    return NextResponse.json({ data: [] });
  }

  try {
    const locale = await getLocale();
    const results = await generatePredictions(signals, locale);

    await supabase.from("ai_predictions").delete().eq("user_id", user.id);

    const rows = results.map((r) => ({
      user_id: user.id,
      category: r.category as PredictionCategory,
      prediction: r.prediction,
      confidence_pct: r.confidencePct,
      reasoning: r.reasoning,
      recommendation: r.recommendation,
      related_entity_type: r.relatedEntityType,
      related_entity_id: r.relatedEntityId,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("ai_predictions")
      .insert(rows)
      .select("*")
      .order("confidence_pct", { ascending: false });

    if (insertError) throw new Error(insertError.message);

    return NextResponse.json({ data: inserted ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI Predict failed" },
      { status: 502 },
    );
  }
}
