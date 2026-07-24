import { awardXpAndCheckAchievements, type AwardResult } from "@/lib/gamification/engine";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** Fetches the user's timezone, then awards XP/checks achievements — the common path shared by every action-level call site. */
export async function awardXp(
  supabase: SupabaseServerClient,
  userId: string,
  source: string,
  relatedId: string | null,
  xp: number,
  coins = 0,
): Promise<AwardResult> {
  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", userId).single();
  const timeZone = profile?.timezone ?? "UTC";
  return awardXpAndCheckAchievements(supabase, userId, timeZone, source, relatedId, xp, coins);
}
