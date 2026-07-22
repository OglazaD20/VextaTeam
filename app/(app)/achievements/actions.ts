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
}

export async function getAchievementsOverview(): Promise<ActionResult<AchievementsOverview>> {
  const { supabase, user } = await requireUser();

  try {
    const [progress, { data: unlocks }] = await Promise.all([
      getUserProgress(supabase, user.id),
      supabase
        .from("user_achievements")
        .select("achievement_id, unlocked_at")
        .eq("user_id", user.id)
        .order("unlocked_at", { ascending: false }),
    ]);

    const unlockedAtById = new Map((unlocks ?? []).map((u) => [u.achievement_id, u.unlocked_at]));

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

    return { data: { progress, byCategory, recentUnlocks } };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't load achievements" };
  }
}
