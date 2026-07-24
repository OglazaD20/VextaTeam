import { NextResponse } from "next/server";

import { runDueScheduleAutomations } from "@/lib/automations/engine";
import { generateBehaviorSuggestions } from "@/lib/automations/suggest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Called once a day by Vercel Cron (see vercel.json — Hobby-plan projects
 * can't schedule cron more often than daily). Fires any due
 * schedule-triggered automations across all users, and — once a week per
 * user (tracked via automations_last_suggested_at on profiles) — generates
 * fresh proactive automation suggestions from real behavior.
 */
export async function GET(request: Request) {
  if (env.CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createServiceClient();

  const scheduleResult = await runDueScheduleAutomations(supabase).catch((error) => ({
    evaluated: 0,
    matched: 0,
    error: error instanceof Error ? error.message : "Schedule automation run failed",
  }));

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: dueForSuggestions } = await supabase
    .from("profiles")
    .select("id, timezone, automations_last_suggested_at")
    .or(`automations_last_suggested_at.is.null,automations_last_suggested_at.lt.${weekAgo}`)
    .limit(50);

  let suggestionsCreated = 0;
  for (const profile of dueForSuggestions ?? []) {
    try {
      suggestionsCreated += await generateBehaviorSuggestions(supabase, profile.id, profile.timezone ?? "UTC");
      await supabase
        .from("profiles")
        .update({ automations_last_suggested_at: new Date().toISOString() })
        .eq("id", profile.id);
    } catch {
      // One user's suggestion generation failing shouldn't block the rest.
    }
  }

  return NextResponse.json({ schedule: scheduleResult, suggestionsCreated });
}
