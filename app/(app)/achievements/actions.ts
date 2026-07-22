"use server";

import { ACHIEVEMENTS, getUserProgress, type UserProgressSummary } from "@/lib/gamification/engine";
import type { AchievementCategory, AchievementDef } from "@/lib/gamification/achievements";
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

export interface AchievementWithStatus extends AchievementDef {
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface AchievementsOverview {
  progress: UserProgressSummary;
  byCategory: Partial<Record<AchievementCategory, AchievementWithStatus[]>>;
  recentUnlocks: AchievementWithStatus[];
  /** Unlocked since the last time this page was viewed — drives "New" badges and the confetti reward. */
  newlyUnlocked: AchievementWithStatus[];
  confettiEnabled: boolean;
}

export async function getAchievementsOverview(): Promise<ActionResult<AchievementsOverview>> {
  const { supabase, user } = await requireUser();

  try {
    const [progress, { data: unlocks }, { data: stats }, { data: effectEquip }] = await Promise.all([
      getUserProgress(supabase, user.id),
      supabase
        .from("user_achievements")
        .select("achievement_id, unlocked_at")
        .eq("user_id", user.id)
        .order("unlocked_at", { ascending: false }),
      supabase.from("user_stats").select("achievements_last_seen_at").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_reward_equips").select("reward_id").eq("user_id", user.id).eq("category", "effect").maybeSingle(),
    ]);

    const unlockedAtById = new Map((unlocks ?? []).map((u) => [u.achievement_id, u.unlocked_at]));
    const lastSeenAt = stats?.achievements_last_seen_at ?? null;

    const withStatus: AchievementWithStatus[] = ACHIEVEMENTS.map((def) => ({
      ...def,
      unlocked: unlockedAtById.has(def.id),
      unlockedAt: unlockedAtById.get(def.id) ?? null,
    }));

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

    // Best-effort: marks this visit as having seen every current unlock, so
    // the same achievement doesn't re-trigger "New" badges/confetti next time.
    await supabase.from("user_stats").update({ achievements_last_seen_at: new Date().toISOString() }).eq("user_id", user.id);

    return {
      data: {
        progress,
        byCategory,
        recentUnlocks,
        newlyUnlocked,
        confettiEnabled: effectEquip?.reward_id === "effect_confetti",
      },
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't load achievements" };
  }
}
