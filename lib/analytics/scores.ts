/**
 * Pure score computation for Life Analytics — every score is 0-100,
 * derived only from real logged data (never invented), and returns null
 * when there isn't enough data to compute it meaningfully rather than
 * defaulting to a misleading 0.
 */

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function average(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

// ---------- Productivity ----------

export interface ProductivityInputs {
  completedTasks: number;
  totalTasks: number;
  goalProgressPcts: number[];
  focusRatios: number[]; // actualMinutes / plannedMinutes per session
}

export function computeProductivityScore(input: ProductivityInputs): number | null {
  const taskPct = input.totalTasks > 0 ? (input.completedTasks / input.totalTasks) * 100 : null;
  const goalPct = input.goalProgressPcts.length > 0 ? average(input.goalProgressPcts) : null;
  const focusPct =
    input.focusRatios.length > 0 ? clamp(average(input.focusRatios.map((r) => r * 100)) ?? 0) : null;

  return average([taskPct, goalPct, focusPct]);
}

// ---------- Health ----------

export interface HealthInputs {
  avgSleepHours: number | null;
  daysWithExercise: number;
  daysWithHydration: number;
  daysWithinCalorieGoal: number;
  totalDays: number;
}

export function computeHealthScore(input: HealthInputs): number | null {
  if (input.totalDays <= 0) return null;

  // 7-9h sleep scores 100; each hour outside that band costs 20 points.
  const sleepScore =
    input.avgSleepHours === null
      ? null
      : clamp(100 - Math.max(0, 7 - input.avgSleepHours, input.avgSleepHours - 9) * 20);

  const exerciseScore = (input.daysWithExercise / input.totalDays) * 100;
  const hydrationScore = (input.daysWithHydration / input.totalDays) * 100;
  const nutritionScore = (input.daysWithinCalorieGoal / input.totalDays) * 100;

  return average([sleepScore, exerciseScore, hydrationScore, nutritionScore]);
}

// ---------- Lifestyle ----------

export interface LifestyleInputs {
  avgMood: number | null; // 1-5 scale
  discoverActivitiesCount: number;
  habitCompletionPct: number | null;
}

const DISCOVER_SATURATION_COUNT = 5; // 5+ saved/logged activities in the period = full marks

export function computeLifestyleScore(input: LifestyleInputs): number | null {
  const moodScore = input.avgMood === null ? null : clamp(((input.avgMood - 1) / 4) * 100);
  const discoverScore = clamp((input.discoverActivitiesCount / DISCOVER_SATURATION_COUNT) * 100);
  const habitScore = input.habitCompletionPct;

  return average([moodScore, discoverScore, habitScore]);
}

// ---------- Consistency ----------

export interface ConsistencyInputs {
  daysWithAnyActivity: number;
  totalDays: number;
}

export function computeConsistencyScore(input: ConsistencyInputs): number | null {
  if (input.totalDays <= 0) return null;
  return clamp((input.daysWithAnyActivity / input.totalDays) * 100);
}

// ---------- Balance ----------

/**
 * How evenly time/effort is spread across life categories, via normalized
 * Shannon entropy. All-in-one-category scores 0; perfectly even scores 100.
 * Needs at least 2 categories with data to mean anything — returns null
 * below that rather than a misleading 0.
 */
export function computeBalanceScore(categoryCounts: Record<string, number>): number | null {
  const counts = Object.values(categoryCounts).filter((c) => c > 0);
  if (counts.length < 2) return null;

  const total = counts.reduce((a, b) => a + b, 0);
  const entropy = -counts.reduce((sum, c) => {
    const p = c / total;
    return sum + p * Math.log2(p);
  }, 0);
  const maxEntropy = Math.log2(counts.length);

  return maxEntropy > 0 ? clamp((entropy / maxEntropy) * 100) : null;
}

// ---------- Life (composite) ----------

export interface LifeScoreInputs {
  productivity: number | null;
  health: number | null;
  lifestyle: number | null;
  consistency: number | null;
  balance: number | null;
}

export function computeLifeScore(input: LifeScoreInputs): number | null {
  return average([input.productivity, input.health, input.lifestyle, input.consistency, input.balance]);
}
