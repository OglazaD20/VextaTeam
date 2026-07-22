/**
 * Achievement definitions live in code (not the database) — user progress
 * and unlocks do. This is the standard pattern for gamification systems:
 * definitions are versioned with the codebase and trivially extensible
 * (add an entry, no migration needed), while lib/gamification/engine.ts
 * checks a live stats snapshot against every definition here.
 */

export type AchievementCategory =
  | "tasks"
  | "habits"
  | "goals"
  | "mood"
  | "nutrition"
  | "health"
  | "finance"
  | "discover"
  | "focus"
  | "memory"
  | "ai"
  | "streak"
  | "level"
  | "secret";

export type AchievementTier = "bronze" | "silver" | "gold" | "platinum" | "legendary";

/** Keys into the live UserStatsSnapshot computed by lib/gamification/engine.ts. */
export type StatKey =
  | "tasksCompleted"
  | "habitLogsTotal"
  | "longestHabitStreak"
  | "goalsCompleted"
  | "moodCheckIns"
  | "foodLogsTotal"
  | "waterLogsTotal"
  | "discoverSavesTotal"
  | "focusSessionsCompleted"
  | "financeTransactionsTotal"
  | "underBudgetMonths"
  | "memoriesCreated"
  | "aiMessagesSent"
  | "activityStreakDays"
  | "earlyTaskCompletions"
  | "level";

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  xp: number;
  coins: number;
  statKey: StatKey;
  target: number;
  hidden?: boolean;
}

const TIER_ORDER: AchievementTier[] = ["bronze", "silver", "gold", "platinum", "legendary"];

function tierForIndex(index: number): AchievementTier {
  return TIER_ORDER[Math.min(index, TIER_ORDER.length - 1)];
}

function tierRewards(tier: AchievementTier): { xp: number; coins: number } {
  switch (tier) {
    case "bronze":
      return { xp: 25, coins: 5 };
    case "silver":
      return { xp: 75, coins: 15 };
    case "gold":
      return { xp: 200, coins: 40 };
    case "platinum":
      return { xp: 500, coins: 100 };
    case "legendary":
      return { xp: 1500, coins: 300 };
  }
}

/** Builds a tiered ladder of achievements for one stat (e.g. "Complete 1/10/50/100/500 tasks"). */
function milestoneLadder(
  idPrefix: string,
  category: AchievementCategory,
  statKey: StatKey,
  thresholds: number[],
  titleFor: (threshold: number) => string,
  descriptionFor: (threshold: number) => string,
): AchievementDef[] {
  return thresholds.map((threshold, index) => {
    const tier = tierForIndex(index);
    const { xp, coins } = tierRewards(tier);
    return {
      id: `${idPrefix}_${threshold}`,
      title: titleFor(threshold),
      description: descriptionFor(threshold),
      category,
      tier,
      xp,
      coins,
      statKey,
      target: threshold,
    };
  });
}

const TASK_ACHIEVEMENTS = milestoneLadder(
  "tasks_completed",
  "tasks",
  "tasksCompleted",
  [1, 10, 50, 100, 250, 500, 1000, 2500],
  (n) => `Task Slayer ${n}`,
  (n) => `Complete ${n} task${n === 1 ? "" : "s"}.`,
);

const HABIT_LOG_ACHIEVEMENTS = milestoneLadder(
  "habit_logs",
  "habits",
  "habitLogsTotal",
  [10, 50, 100, 365, 1000],
  (n) => `Habit Builder ${n}`,
  (n) => `Log ${n} habit check-ins.`,
);

const HABIT_STREAK_ACHIEVEMENTS = milestoneLadder(
  "habit_streak",
  "streak",
  "longestHabitStreak",
  [3, 7, 14, 30, 100, 365],
  (n) => (n === 365 ? "365-Day Streak" : `${n}-Day Streak`),
  (n) => `Keep a single habit's streak alive for ${n} days.`,
);

const GOAL_ACHIEVEMENTS = milestoneLadder(
  "goals_completed",
  "goals",
  "goalsCompleted",
  [1, 5, 10, 25, 50, 100],
  (n) => `Goal Getter ${n}`,
  (n) => `Complete ${n} goal${n === 1 ? "" : "s"}.`,
);

const MOOD_ACHIEVEMENTS = milestoneLadder(
  "mood_checkins",
  "mood",
  "moodCheckIns",
  [1, 10, 50, 100, 365],
  (n) => `Self-Aware ${n}`,
  (n) => `Log ${n} mood check-in${n === 1 ? "" : "s"}.`,
);

const NUTRITION_ACHIEVEMENTS = milestoneLadder(
  "food_logs",
  "nutrition",
  "foodLogsTotal",
  [1, 50, 100, 365, 1000],
  (n) => `Mindful Eater ${n}`,
  (n) => `Log ${n} food entr${n === 1 ? "y" : "ies"}.`,
);

const HYDRATION_ACHIEVEMENTS = milestoneLadder(
  "water_logs",
  "health",
  "waterLogsTotal",
  [10, 50, 100, 365],
  (n) => `Hydrated ${n}`,
  (n) => `Log water ${n} times.`,
);

const DISCOVER_ACHIEVEMENTS = milestoneLadder(
  "discover_saves",
  "discover",
  "discoverSavesTotal",
  [1, 5, 10, 25, 50, 100],
  (n) => `Explorer ${n}`,
  (n) => `Save ${n} place${n === 1 ? "" : "s"} or event${n === 1 ? "" : "s"} from Discover.`,
);

const FOCUS_ACHIEVEMENTS = milestoneLadder(
  "focus_sessions",
  "focus",
  "focusSessionsCompleted",
  [1, 10, 50, 100, 500],
  (n) => `Deep Work ${n}`,
  (n) => `Complete ${n} focus session${n === 1 ? "" : "s"}.`,
);

const FINANCE_ACHIEVEMENTS = milestoneLadder(
  "finance_logs",
  "finance",
  "financeTransactionsTotal",
  [1, 25, 100, 365],
  (n) => `Budget Tracker ${n}`,
  (n) => `Log ${n} transaction${n === 1 ? "" : "s"}.`,
);

const BUDGET_STREAK_ACHIEVEMENTS = milestoneLadder(
  "under_budget_months",
  "finance",
  "underBudgetMonths",
  [1, 3, 6, 12],
  (n) => `Saver ${n}`,
  (n) => `Stay under budget for ${n} month${n === 1 ? "" : "s"}.`,
);

const MEMORY_ACHIEVEMENTS = milestoneLadder(
  "memories_created",
  "memory",
  "memoriesCreated",
  [1, 10, 50, 100],
  (n) => `Second Brain ${n}`,
  (n) => `Build up ${n} memor${n === 1 ? "y" : "ies"} in AI Memory.`,
);

const AI_ACHIEVEMENTS = milestoneLadder(
  "ai_messages",
  "ai",
  "aiMessagesSent",
  [1, 10, 50, 200],
  (n) => `AI Native ${n}`,
  (n) => `Send ${n} message${n === 1 ? "" : "s"} to the AI assistant.`,
);

const ACTIVITY_STREAK_ACHIEVEMENTS = milestoneLadder(
  "activity_streak",
  "streak",
  "activityStreakDays",
  [3, 7, 30, 100, 365],
  (n) => `Consistent ${n}`,
  (n) => `Log something in LifeFlow ${n} days in a row.`,
);

const EARLY_BIRD_ACHIEVEMENTS = milestoneLadder(
  "early_bird",
  "habits",
  "earlyTaskCompletions",
  [10, 50, 100],
  (n) => `Early Bird ${n}`,
  (n) => `Complete ${n} task${n === 1 ? "" : "s"} scheduled before 7 AM.`,
);

const LEVEL_ACHIEVEMENTS = milestoneLadder(
  "level_reached",
  "level",
  "level",
  [10, 25, 50, 100],
  (n) => `Level ${n}`,
  (n) => `Reach level ${n}.`,
);

const SECRET_ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "secret_perfect_week",
    title: "Perfect Week",
    description: "Logged something in LifeFlow every single day for a week.",
    category: "secret",
    tier: "gold",
    xp: 250,
    coins: 50,
    statKey: "activityStreakDays",
    target: 7,
    hidden: true,
  },
  {
    id: "secret_all_rounder",
    title: "All-Rounder",
    description: "Reached level 5 while touching every core module at least once.",
    category: "secret",
    tier: "silver",
    xp: 100,
    coins: 20,
    statKey: "level",
    target: 5,
    hidden: true,
  },
];

export const ACHIEVEMENTS: AchievementDef[] = [
  ...TASK_ACHIEVEMENTS,
  ...HABIT_LOG_ACHIEVEMENTS,
  ...HABIT_STREAK_ACHIEVEMENTS,
  ...GOAL_ACHIEVEMENTS,
  ...MOOD_ACHIEVEMENTS,
  ...NUTRITION_ACHIEVEMENTS,
  ...HYDRATION_ACHIEVEMENTS,
  ...DISCOVER_ACHIEVEMENTS,
  ...FOCUS_ACHIEVEMENTS,
  ...FINANCE_ACHIEVEMENTS,
  ...BUDGET_STREAK_ACHIEVEMENTS,
  ...MEMORY_ACHIEVEMENTS,
  ...AI_ACHIEVEMENTS,
  ...ACTIVITY_STREAK_ACHIEVEMENTS,
  ...EARLY_BIRD_ACHIEVEMENTS,
  ...LEVEL_ACHIEVEMENTS,
  ...SECRET_ACHIEVEMENTS,
];

export const ACHIEVEMENTS_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
