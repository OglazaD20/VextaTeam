"use server";

import { revalidatePath } from "next/cache";

import { defaultRewardIdForCategory, REWARDS, type RewardCategory, type RewardDef } from "@/lib/rewards/rewards";
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

export interface RewardsOverview {
  byCategory: Record<RewardCategory, RewardWithStatus[]>;
}

export async function getRewardsOverview(): Promise<ActionResult<RewardsOverview>> {
  const { supabase, user } = await requireUser();

  try {
    const [{ data: owned }, { data: equips }] = await Promise.all([
      supabase.from("user_rewards").select("reward_id").eq("user_id", user.id),
      supabase.from("user_reward_equips").select("category, reward_id").eq("user_id", user.id),
    ]);

    const ownedIds = new Set((owned ?? []).map((o) => o.reward_id));
    const equippedByCategory = new Map((equips ?? []).map((e) => [e.category, e.reward_id]));

    const byCategory: Record<RewardCategory, RewardWithStatus[]> = { theme: [], frame: [], effect: [] };
    for (const reward of REWARDS) {
      const isOwned = reward.free || ownedIds.has(reward.id);
      const equippedId = equippedByCategory.get(reward.category) ?? defaultRewardIdForCategory(reward.category);
      byCategory[reward.category].push({ ...reward, owned: isOwned, equipped: equippedId === reward.id });
    }

    return { data: { byCategory } };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't load rewards" };
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

  revalidatePath("/rewards");
  revalidatePath("/", "layout");
  return {};
}
