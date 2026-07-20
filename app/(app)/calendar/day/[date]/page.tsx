import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { addDays, subDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";

import { DayViewHeader } from "@/components/calendar/day-view-header";
import { DayTimeline } from "@/components/timeline/day-timeline";
import { getDayRangeUtc } from "@/lib/scheduling/day-range";
import { dateKey } from "@/lib/scheduling/month-range";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Day view — LifeFlow" };

const DAY_LABEL = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});

export default async function CalendarDayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
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
  const timeZone = profile?.timezone ?? "UTC";

  const resolvedKey = date === "today" ? dateKey(toZonedTime(new Date(), timeZone)) : date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(resolvedKey)) {
    notFound();
  }

  const [year, month, day] = resolvedKey.split("-").map(Number);
  const localDate = new Date(year, month - 1, day);
  if (Number.isNaN(localDate.getTime())) {
    notFound();
  }

  const { start, end } = getDayRangeUtc(timeZone, resolvedKey);

  const [{ data: items, error }, { data: tagRows }] = await Promise.all([
    supabase
      .from("schedule_items")
      .select("*")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .is("archived_at", null)
      .gte("scheduled_start", start.toISOString())
      .lte("scheduled_start", end.toISOString())
      .order("scheduled_start", { ascending: true }),
    supabase.from("tags").select("name").eq("user_id", user.id).order("name"),
  ]);

  if (error) {
    throw new Error(`Failed to load that day's schedule: ${error.message}`);
  }

  const allTags = (tagRows ?? []).map((t) => t.name);
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col gap-6 p-6">
      <DayViewHeader
        dateKey={resolvedKey}
        label={DAY_LABEL.format(localDate)}
        prevKey={dateKey(subDays(localDate, 1))}
        nextKey={dateKey(addDays(localDate, 1))}
        monthKey={monthKey}
        allTags={allTags}
      />
      <DayTimeline
        items={items ?? []}
        allTags={allTags}
        emptyTitle="Nothing scheduled this day"
      />
    </div>
  );
}
