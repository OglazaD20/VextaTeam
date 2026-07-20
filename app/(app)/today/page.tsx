import type { Metadata } from "next";

import { TodayHeader } from "@/components/timeline/today-header";
import { DayTimeline } from "@/components/timeline/day-timeline";
import { UnscheduledList } from "@/components/timeline/unscheduled-list";
import { ArchivedSection } from "@/components/tasks/archived-section";
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

  const [
    { data: items, error },
    { data: unscheduled, error: unscheduledError },
    { data: archived, error: archivedError },
    { data: tagRows },
  ] = await Promise.all([
    supabase
      .from("schedule_items")
      .select("*")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .is("archived_at", null)
      .gte("scheduled_start", start.toISOString())
      .lte("scheduled_start", end.toISOString())
      .order("scheduled_start", { ascending: true }),
    supabase
      .from("schedule_items")
      .select("*")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .is("archived_at", null)
      .is("scheduled_start", null)
      .eq("status", "planned")
      .order("sort_order", { ascending: true }),
    supabase
      .from("schedule_items")
      .select("*")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false })
      .limit(50),
    supabase.from("tags").select("name").eq("user_id", user.id).order("name"),
  ]);

  if (error) {
    throw new Error(`Failed to load today's schedule: ${error.message}`);
  }
  if (unscheduledError) {
    throw new Error(`Failed to load unscheduled items: ${unscheduledError.message}`);
  }
  if (archivedError) {
    throw new Error(`Failed to load archived tasks: ${archivedError.message}`);
  }

  const allTags = (tagRows ?? []).map((t) => t.name);

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col gap-6 p-6">
      <TodayHeader allTags={allTags} />
      <DayTimeline items={items ?? []} allTags={allTags} />
      <UnscheduledList items={unscheduled ?? []} allTags={allTags} />
      <ArchivedSection items={archived ?? []} />
    </div>
  );
}
