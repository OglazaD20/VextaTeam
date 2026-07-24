import type { Metadata } from "next";

import { FocusTimer } from "@/components/focus/focus-timer";
import { SessionHistory } from "@/components/focus/session-history";
import { getTodayRangeUtc } from "@/lib/scheduling/day-range";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Focus — LifeFlow" };

export default async function FocusPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();

  const { data: settings } = await supabase
    .from("user_settings")
    .select("focus_block_minutes, break_minutes")
    .eq("user_id", user.id)
    .single();

  const timeZone = profile?.timezone ?? "UTC";
  const { start, end } = getTodayRangeUtc(timeZone);

  const { data: sessions, error } = await supabase
    .from("focus_sessions")
    .select("*")
    .eq("user_id", user.id)
    .gte("started_at", start.toISOString())
    .lte("started_at", end.toISOString())
    .order("started_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load focus sessions: ${error.message}`);
  }

  return (
    <div className="mx-auto flex h-full max-w-xl flex-col gap-8 p-6">
      <div className="text-center">
        <h1 className="text-xl font-semibold tracking-tight">Focus</h1>
        <p className="text-sm text-muted-foreground">
          Protect a block of deep work.
        </p>
      </div>

      <FocusTimer
        focusBlockMinutes={settings?.focus_block_minutes ?? 50}
        breakMinutes={settings?.break_minutes ?? 10}
      />

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Today&apos;s sessions
        </h2>
        <SessionHistory sessions={sessions ?? []} />
      </div>
    </div>
  );
}
