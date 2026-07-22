import { toZonedTime } from "date-fns-tz";

import { getHabitsWithStreaks } from "@/lib/habits/get-habits-with-streaks";
import { ACHIEVEMENTS, ACHIEVEMENTS_BY_ID, type AchievementDef, type StatKey } from "@/lib/gamification/achievements";
import { computeLevel, computeLevelProgress, type LevelProgress } from "@/lib/gamification/leveling";
import { REWARDS, type RewardDef } from "@/lib/rewards/rewards";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type UserStatsSnapshot = Record<StatKey, number>;

/**
 * A single pass of COUNT-style queries, run in parallel, producing every
 * stat every achievement definition compares against. Achievement checks
 * then run as cheap in-memory comparisons against this snapshot — the DB
 * round trips are the only real cost, and they're bounded and parallel.
 */
export async function computeUserStatsSnapshot(
  supabase: SupabaseServerClient,
  userId: string,
  timeZone: string,
  currentXp: number,
): Promise<UserStatsSnapshot> {
  const [
    { count: tasksCompleted },
    { count: habitLogsTotal },
    { count: goalsCompleted },
    { count: moodCheckIns },
    { count: foodLogsTotal },
    { count: waterLogsTotal },
    { count: discoverSavesTotal },
    { count: focusSessionsCompleted },
    { count: financeTransactionsTotal },
    { count: memoriesCreated },
    { data: conversationIds },
    habitsWithStreaks,
    { data: earlyTasks },
    { data: activityDates },
    { data: budgets },
    { data: financeTransactionsForBudget },
  ] = await Promise.all([
    supabase.from("schedule_items").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "completed"),
    supabase.from("habit_logs").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("completed", true),
    supabase.from("goals").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "completed"),
    supabase.from("mood_logs").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("food_logs").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("water_logs").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("saved_activities").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("focus_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId).not("ended_at", "is", null),
    supabase.from("transactions").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("memories").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("ai_conversations").select("id").eq("user_id", userId),
    getHabitsWithStreaks(supabase, userId, timeZone),
    supabase
      .from("schedule_items")
      .select("scheduled_start")
      .eq("user_id", userId)
      .eq("status", "completed")
      .not("scheduled_start", "is", null)
      .limit(2000),
    // Bounded lookback windows keep these two "streak/history" queries cheap.
    supabase
      .from("schedule_items")
      .select("scheduled_start, completed_at:updated_at")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .gte("scheduled_start", new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString())
      .limit(3000),
    supabase.from("finance_budgets").select("category, monthly_limit").eq("user_id", userId),
    supabase
      .from("transactions")
      .select("category, amount, occurred_at")
      .eq("user_id", userId)
      .eq("type", "expense")
      .gte("occurred_at", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
      .limit(5000),
  ]);

  const aiConversationIds = (conversationIds ?? []).map((c) => c.id);
  let aiMessagesSent = 0;
  if (aiConversationIds.length > 0) {
    const { count } = await supabase
      .from("ai_messages")
      .select("id", { count: "exact", head: true })
      .eq("role", "user")
      .in("conversation_id", aiConversationIds);
    aiMessagesSent = count ?? 0;
  }

  const longestHabitStreak = habitsWithStreaks.reduce((max, h) => Math.max(max, h.streak), 0);

  const earlyTaskCompletions = (earlyTasks ?? []).filter((t) => {
    if (!t.scheduled_start) return false;
    return toZonedTime(new Date(t.scheduled_start), timeZone).getHours() < 7;
  }).length;

  const activityStreakDays = computeActivityStreak(activityDates ?? [], timeZone);

  const underBudgetMonths = computeUnderBudgetMonths(financeTransactionsForBudget ?? [], budgets ?? []);

  return {
    tasksCompleted: tasksCompleted ?? 0,
    habitLogsTotal: habitLogsTotal ?? 0,
    longestHabitStreak,
    goalsCompleted: goalsCompleted ?? 0,
    moodCheckIns: moodCheckIns ?? 0,
    foodLogsTotal: foodLogsTotal ?? 0,
    waterLogsTotal: waterLogsTotal ?? 0,
    discoverSavesTotal: discoverSavesTotal ?? 0,
    focusSessionsCompleted: focusSessionsCompleted ?? 0,
    financeTransactionsTotal: financeTransactionsTotal ?? 0,
    underBudgetMonths,
    memoriesCreated: memoriesCreated ?? 0,
    aiMessagesSent,
    activityStreakDays,
    earlyTaskCompletions,
    level: computeLevel(currentXp),
  };
}

/** Longest run of consecutive days (ending today or yesterday) with at least one completed/updated item. */
function computeActivityStreak(rows: { scheduled_start: string | null; completed_at: string }[], timeZone: string): number {
  const dateKeys = new Set(
    rows
      .map((r) => r.completed_at)
      .filter(Boolean)
      .map((iso) => toZonedTime(new Date(iso), timeZone).toISOString().slice(0, 10)),
  );

  let streak = 0;
  const cursor = toZonedTime(new Date(), timeZone);
  // Allow today to be "not yet logged" without breaking the streak.
  if (!dateKeys.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (dateKeys.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Distinct months (within the lookback window) where every budgeted category stayed within its current limit. */
function computeUnderBudgetMonths(
  transactions: { category: string; amount: number; occurred_at: string }[],
  budgets: { category: string; monthly_limit: number }[],
): number {
  if (budgets.length === 0) return 0;

  const spendByMonthCategory = new Map<string, Map<string, number>>();
  for (const t of transactions) {
    const monthKey = t.occurred_at.slice(0, 7);
    if (!spendByMonthCategory.has(monthKey)) spendByMonthCategory.set(monthKey, new Map());
    const byCategory = spendByMonthCategory.get(monthKey)!;
    byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount);
  }

  let count = 0;
  for (const byCategory of spendByMonthCategory.values()) {
    const withinAll = budgets.every((b) => (byCategory.get(b.category) ?? 0) <= b.monthly_limit);
    if (withinAll) count += 1;
  }
  return count;
}

export interface AwardResult {
  newlyUnlocked: AchievementDef[];
  newlyUnlockedRewards: RewardDef[];
  totalXpAwarded: number;
  totalCoinsAwarded: number;
  levelUp: boolean;
}

async function awardXpEvent(
  supabase: SupabaseServerClient,
  userId: string,
  source: string,
  relatedId: string | null,
  xp: number,
  coins: number,
): Promise<boolean> {
  const { error } = await supabase.from("xp_events").insert({
    user_id: userId,
    source,
    related_id: relatedId,
    xp_awarded: xp,
    coins_awarded: coins,
  });
  // A unique-violation means this exact event already awarded XP — not an error, just a no-op.
  return !error;
}

/**
 * Awards XP/coins for a real action (task completed, habit logged, etc.),
 * then re-checks every achievement against a fresh stats snapshot and
 * unlocks any newly-qualifying ones. Best-effort: never throws, since a
 * gamification hiccup should never break the action that triggered it.
 */
export async function awardXpAndCheckAchievements(
  supabase: SupabaseServerClient,
  userId: string,
  timeZone: string,
  source: string,
  relatedId: string | null,
  xp: number,
  coins = 0,
): Promise<AwardResult> {
  const empty: AwardResult = {
    newlyUnlocked: [],
    newlyUnlockedRewards: [],
    totalXpAwarded: 0,
    totalCoinsAwarded: 0,
    levelUp: false,
  };

  try {
    const { data: existingStats } = await supabase.from("user_stats").select("xp, coins").eq("user_id", userId).maybeSingle();
    const xpBefore = existingStats?.xp ?? 0;
    const levelBefore = computeLevel(xpBefore);

    const awarded = await awardXpEvent(supabase, userId, source, relatedId, xp, coins);
    let totalXp = awarded ? xp : 0;
    let totalCoins = awarded ? coins : 0;
    const newlyUnlockedRewards: RewardDef[] = [];

    const { data: existingUnlocks } = await supabase.from("user_achievements").select("achievement_id").eq("user_id", userId);
    const unlockedIds = new Set((existingUnlocks ?? []).map((u) => u.achievement_id));

    // Two passes: the first can award XP that pushes the user's level up,
    // which the second pass needs to see for level-gated achievements.
    let snapshot = await computeUserStatsSnapshot(supabase, userId, timeZone, xpBefore + totalXp);
    let newlyUnlocked = findNewlyUnlocked(snapshot, unlockedIds);

    for (const def of newlyUnlocked) {
      const result = await unlockAchievement(supabase, userId, def);
      if (result.ok) {
        totalXp += def.xp;
        totalCoins += def.coins;
        unlockedIds.add(def.id);
        newlyUnlockedRewards.push(...result.rewards);
      }
    }

    if (newlyUnlocked.length > 0) {
      snapshot = await computeUserStatsSnapshot(supabase, userId, timeZone, xpBefore + totalXp);
      const secondPass = findNewlyUnlocked(snapshot, unlockedIds);
      for (const def of secondPass) {
        const result = await unlockAchievement(supabase, userId, def);
        if (result.ok) {
          totalXp += def.xp;
          totalCoins += def.coins;
          unlockedIds.add(def.id);
          newlyUnlockedRewards.push(...result.rewards);
        }
      }
      newlyUnlocked = [...newlyUnlocked, ...secondPass];
    }

    const xpAfter = xpBefore + totalXp;
    await supabase.from("user_stats").upsert(
      {
        user_id: userId,
        xp: xpAfter,
        coins: (existingStats?.coins ?? 0) + totalCoins,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    return {
      newlyUnlocked,
      newlyUnlockedRewards,
      totalXpAwarded: totalXp,
      totalCoinsAwarded: totalCoins,
      levelUp: computeLevel(xpAfter) > levelBefore,
    };
  } catch {
    return empty;
  }
}

function findNewlyUnlocked(snapshot: UserStatsSnapshot, alreadyUnlocked: Set<string>): AchievementDef[] {
  return ACHIEVEMENTS.filter((def) => !alreadyUnlocked.has(def.id) && snapshot[def.statKey] >= def.target);
}

async function unlockAchievement(
  supabase: SupabaseServerClient,
  userId: string,
  def: AchievementDef,
): Promise<{ ok: boolean; rewards: RewardDef[] }> {
  const { error } = await supabase.from("user_achievements").insert({
    user_id: userId,
    achievement_id: def.id,
    progress_current: def.target,
  });
  if (error) return { ok: false, rewards: [] };
  await awardXpEvent(supabase, userId, "achievement_unlocked", def.id, def.xp, def.coins);

  const matchingRewards = REWARDS.filter((r) => r.unlockAchievementId === def.id);
  const grantedRewards: RewardDef[] = [];
  for (const reward of matchingRewards) {
    const { error: rewardError } = await supabase.from("user_rewards").insert({ user_id: userId, reward_id: reward.id });
    if (!rewardError) grantedRewards.push(reward);
  }

  return { ok: true, rewards: grantedRewards };
}

export interface UserProgressSummary {
  xp: number;
  coins: number;
  levelProgress: LevelProgress;
  unlockedCount: number;
  totalCount: number;
}

export async function getUserProgress(supabase: SupabaseServerClient, userId: string): Promise<UserProgressSummary> {
  const [{ data: stats }, { count: unlockedCount }] = await Promise.all([
    supabase.from("user_stats").select("xp, coins").eq("user_id", userId).maybeSingle(),
    supabase.from("user_achievements").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  const xp = stats?.xp ?? 0;

  return {
    xp,
    coins: stats?.coins ?? 0,
    levelProgress: computeLevelProgress(xp),
    unlockedCount: unlockedCount ?? 0,
    totalCount: ACHIEVEMENTS.length,
  };
}

export { ACHIEVEMENTS, ACHIEVEMENTS_BY_ID };
