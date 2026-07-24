import { projectMonthEndSpend } from "@/lib/finance/calculations";

/**
 * Pure, deterministic forecast math for AI Predict — same principle as
 * lib/coach/signals.ts: every number here is computed from real logged
 * data. The AI layer (lib/ai/generate-predictions.ts) only phrases
 * sentences and never touches confidencePct or any other number computed
 * here — it's handed through to the UI exactly as computed.
 */

export interface GoalForecastSignal {
  goalId: string;
  goalTitle: string;
  progressPct: number;
  paceRatio: number;
  daysRemaining: number;
  onTrack: boolean;
  confidencePct: number;
}

/** Compares progress made so far against time elapsed toward the deadline. */
export function computeGoalForecast(goal: {
  id: string;
  title: string;
  createdAt: Date;
  deadline: Date;
  progressPct: number;
}): GoalForecastSignal | null {
  const now = Date.now();
  const totalMs = goal.deadline.getTime() - goal.createdAt.getTime();
  const elapsedMs = now - goal.createdAt.getTime();
  if (totalMs <= 0 || elapsedMs <= 0 || goal.deadline.getTime() <= now) return null;

  const elapsedPct = Math.min(1, elapsedMs / totalMs);
  if (elapsedPct < 0.05) return null; // too early to say anything meaningful

  const paceRatio = elapsedPct > 0 ? goal.progressPct / 100 / elapsedPct : 0;
  const daysRemaining = Math.max(0, Math.round((goal.deadline.getTime() - now) / 86_400_000));
  const onTrack = paceRatio >= 0.95;

  const paceDeviation = Math.min(1, Math.abs(paceRatio - 1));
  const confidencePct = Math.round(Math.min(95, Math.max(30, 45 + paceDeviation * 35 + elapsedPct * 20)));

  return {
    goalId: goal.id,
    goalTitle: goal.title,
    progressPct: goal.progressPct,
    paceRatio: Math.round(paceRatio * 100) / 100,
    daysRemaining,
    onTrack,
    confidencePct,
  };
}

export interface WeightProjectionSignal {
  ratePerWeekKg: number;
  projectedChangeKg: number;
  weeksAhead: number;
  confidencePct: number;
}

/** Extrapolates the trailing weight trend forward by a fixed horizon. */
export function computeWeightProjection(
  metrics: { dateKey: string; weightKg: number | null }[],
  weeksAhead = 8,
): WeightProjectionSignal | null {
  const withWeight = metrics.filter((m) => m.weightKg !== null);
  if (withWeight.length < 4) return null;

  const first = withWeight[0];
  const last = withWeight[withWeight.length - 1];
  const daysBetween = (new Date(last.dateKey).getTime() - new Date(first.dateKey).getTime()) / 86_400_000;
  if (daysBetween < 7) return null;

  const totalChangeKg = last.weightKg! - first.weightKg!;
  const ratePerWeekKg = Math.round((totalChangeKg / daysBetween) * 7 * 100) / 100;
  if (Math.abs(ratePerWeekKg) < 0.05) return null;

  const projectedChangeKg = Math.round(ratePerWeekKg * weeksAhead * 10) / 10;
  const confidencePct = Math.round(Math.min(90, Math.max(35, 35 + withWeight.length * 3)));

  return { ratePerWeekKg, projectedChangeKg, weeksAhead, confidencePct };
}

export interface HabitMissRiskSignal {
  habitId: string;
  habitName: string;
  completionsThisPeriod: number;
  targetPerPeriod: number;
  expectedByNow: number;
  confidencePct: number;
}

/** Flags a habit clearly behind the pace needed to hit its period target. */
export function computeHabitMissRisk(habit: {
  id: string;
  name: string;
  completionsThisPeriod: number;
  targetPerPeriod: number;
  daysElapsedInPeriod: number;
  daysTotalInPeriod: number;
}): HabitMissRiskSignal | null {
  if (habit.targetPerPeriod <= 0 || habit.daysTotalInPeriod <= 0) return null;

  const daysElapsedPct = habit.daysElapsedInPeriod / habit.daysTotalInPeriod;
  if (daysElapsedPct < 0.25 || daysElapsedPct >= 1) return null;

  const expectedByNow = habit.targetPerPeriod * daysElapsedPct;
  const likelyToMiss = habit.completionsThisPeriod < expectedByNow * 0.7;
  if (!likelyToMiss) return null;

  const shortfallRatio = 1 - habit.completionsThisPeriod / Math.max(expectedByNow, 0.01);
  const confidencePct = Math.round(
    Math.min(95, Math.max(40, 45 + shortfallRatio * 35 + daysElapsedPct * 15)),
  );

  return {
    habitId: habit.id,
    habitName: habit.name,
    completionsThisPeriod: habit.completionsThisPeriod,
    targetPerPeriod: habit.targetPerPeriod,
    expectedByNow: Math.round(expectedByNow * 10) / 10,
    confidencePct,
  };
}

export interface BudgetForecastSignal {
  category: string;
  limit: number;
  spentSoFar: number;
  projected: number;
  overBy: number;
  confidencePct: number;
}

/** Projects month-end spend for one budget category from the pace so far. */
export function computeBudgetForecast(
  category: string,
  limit: number,
  spentSoFar: number,
  dayOfMonth: number,
  daysInMonth: number,
): BudgetForecastSignal | null {
  if (limit <= 0 || dayOfMonth < 3) return null;

  const projected = projectMonthEndSpend(spentSoFar, dayOfMonth, daysInMonth);
  if (projected <= limit) return null;

  const overBy = Math.round((projected - limit) * 100) / 100;
  const monthPct = dayOfMonth / daysInMonth;
  const overshootRatio = Math.min(1, overBy / limit);
  const confidencePct = Math.round(Math.min(95, Math.max(40, 45 + monthPct * 35 + overshootRatio * 20)));

  return { category, limit, spentSoFar, projected, overBy, confidencePct };
}
