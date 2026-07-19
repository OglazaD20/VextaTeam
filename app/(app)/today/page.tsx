import type { Metadata } from "next";

import { TodayHeader } from "@/components/timeline/today-header";
import { DayTimeline } from "@/components/timeline/day-timeline";
import { getTodayRangeUtc } from "@/lib/scheduling/day-range";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Today — LifeFlow" };

export default async function TodayPage() {
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

  const { start, end } = getTodayRangeUtc(profile?.timezone ?? "UTC");

  const { data: items, error } = await supabase
    .from("schedule_items")
    .select("*")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .gte("scheduled_start", start.toISOString())
    .lte("scheduled_start", end.toISOString())
    .order("scheduled_start", { ascending: true });

  if (error) {
    throw new Error(`Failed to load today's schedule: ${error.message}`);
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col gap-6 p-6">
      <TodayHeader />
      <DayTimeline items={items ?? []} />
    </div>
  );
}
