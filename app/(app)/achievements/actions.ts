"use server";

import { revalidatePath } from "next/cache";

import { computeUserStatsSnapshot, getUserProgress, type UserProgressSummary } from "@/lib/gamification/engine";
import { ACHIEVEMENTS } from "@/lib/gamification/achievements";
import type { AchievementCategory, AchievementDef } from "@/lib/gamification/achievements";
import { defaultRewardIdForCategory, REWARDS } from "@/lib/rewards/rewards";
import type { RewardCategory, RewardDef } from "@/lib/rewards/rewards";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult<T = undefined> {
  error?: string;
  data?: T;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  return { supabase, user };
}

export interface RewardWithStatus extends RewardDef {
  owned: boolean;
  equipped: boolean;
}

export interface AchievementWithStatus extends AchievementDef {
  unlocked: boolean;
  unlockedAt: string | null;
  /** Live progress toward `target` — shown on locked achievements as a progress bar. */
  currentValue: number;
  /** The cosmetic this achievement grants on unlock, if any — every achievement's baseline reward is its xp/coins (already on the def itself). */
  reward: RewardWithStatus | null;
}

export interface AchievementsOverview {
  progress: UserProgressSummary;
  byCategory: Partial<Record<AchievementCategory, AchievementWithStatus[]>>;
  recentUnlocks: AchievementWithStatus[];
  /** Unlocked since the last time this page was viewed — drives "New" badges and the confetti reward. */
  newlyUnlocked: AchievementWithStatus[];
  confettiEnabled: boolean;
  /** Every cosmetic reward, owned or not, grouped by category — the merged "Your Collection" equip section. */
  collection: Record<RewardCategory, RewardWithStatus[]>;
}

export async function getAchievementsOverview(): Promise<ActionResult<AchievementsOverview>> {
  const { supabase, user } = await requireUser();

  try {
    const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", user.id).single();
    const timeZone = profile?.timezone ?? "UTC";

    const progress = await getUserProgress(supabase, user.id);

    const [{ data: unlocks }, { data: stats }, { data: ownedRewards }, { data: equips }, snapshot] = await Promise.all([
      supabase
        .from("user_achievements")
        .select("achievement_id, unlocked_at")
        .eq("user_id", user.id)
        .order("unlocked_at", { ascending: false }),
      supabase.from("user_stats").select("achievements_last_seen_at").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_rewards").select("reward_id").eq("user_id", user.id),
      supabase.from("user_reward_equips").select("category, reward_id").eq("user_id", user.id),
      computeUserStatsSnapshot(supabase, user.id, timeZone, progress.xp),
    ]);

    const unlockedAtById = new Map((unlocks ?? []).map((u) => [u.achievement_id, u.unlocked_at]));
    const lastSeenAt = stats?.achievements_last_seen_at ?? null;
    const ownedRewardIds = new Set((ownedRewards ?? []).map((r) => r.reward_id));
    const equippedByCategory = new Map((equips ?? []).map((e) => [e.category, e.reward_id]));

    function rewardStatus(reward: RewardDef): RewardWithStatus {
      const isOwned = reward.free || ownedRewardIds.has(reward.id);
      const equippedId = equippedByCategory.get(reward.category) ?? defaultRewardIdForCategory(reward.category);
      return { ...reward, owned: isOwned, equipped: equippedId === reward.id };
    }

    const rewardByAchievementId = new Map(REWARDS.filter((r) => r.unlockAchievementId).map((r) => [r.unlockAchievementId!, r]));

    const withStatus: AchievementWithStatus[] = ACHIEVEMENTS.map((def) => {
      const linkedReward = rewardByAchievementId.get(def.id);
      return {
        ...def,
        unlocked: unlockedAtById.has(def.id),
        unlockedAt: unlockedAtById.get(def.id) ?? null,
        currentValue: snapshot[def.statKey] ?? 0,
        reward: linkedReward ? rewardStatus(linkedReward) : null,
      };
    });

    const byCategory: Partial<Record<AchievementCategory, AchievementWithStatus[]>> = {};
    for (const def of withStatus) {
      if (!byCategory[def.category]) byCategory[def.category] = [];
      byCategory[def.category]!.push(def);
    }

    const recentUnlocks = withStatus
      .filter((a) => a.unlocked)
      .sort((a, b) => (b.unlockedAt ?? "").localeCompare(a.unlockedAt ?? ""))
      .slice(0, 8);

    const newlyUnlocked = lastSeenAt
      ? withStatus.filter((a) => a.unlocked && a.unlockedAt && a.unlockedAt > lastSeenAt)
      : [];

    const collection: Record<RewardCategory, RewardWithStatus[]> = { theme: [], frame: [], effect: [] };
    for (const reward of REWARDS) {
      collection[reward.category].push(rewardStatus(reward));
    }

    // Best-effort: marks this visit as having seen every current unlock, so
    // the same achievement doesn't re-trigger "New" badges/confetti next time.
    await supabase.from("user_stats").update({ achievements_last_seen_at: new Date().toISOString() }).eq("user_id", user.id);

    return {
      data: {
        progress,
        byCategory,
        recentUnlocks,
        newlyUnlocked,
        confettiEnabled: equippedByCategory.get("effect") === "effect_confetti",
        collection,
      },
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't load achievements" };
  }
}

export async function equipReward(rewardId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const reward = REWARDS.find((r) => r.id === rewardId);
  if (!reward) return { error: "Unknown reward" };

  if (!reward.free) {
    const { data: ownedRow } = await supabase
      .from("user_rewards")
      .select("id")
      .eq("user_id", user.id)
      .eq("reward_id", rewardId)
      .maybeSingle();
    if (!ownedRow) return { error: "You haven't unlocked this yet" };
  }

  const { error } = await supabase.from("user_reward_equips").upsert(
    { user_id: user.id, category: reward.category, reward_id: rewardId, updated_at: new Date().toISOString() },
    { onConflict: "user_id,category" },
  );

  if (error) return { error: error.message };

  revalidatePath("/analytics");
  revalidatePath("/", "layout");
  return {};
}
