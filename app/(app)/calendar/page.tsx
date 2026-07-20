import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { toZonedTime } from "date-fns-tz";

import { MonthGrid } from "@/components/calendar/month-grid";
import type { DayCellStat } from "@/components/calendar/day-cell";
import { Button } from "@/components/ui/button";
import { dateKey, getMonthRangeUtc } from "@/lib/scheduling/month-range";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Calendar — LifeFlow" };

const MONTH_LABEL = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });

function parseMonthParam(param: string | undefined, timeZone: string) {
  const now = toZonedTime(new Date(), timeZone);
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [year, month] = param.split("-").map(Number);
    return { year, monthIndex0: month - 1 };
  }
  return { year: now.getFullYear(), monthIndex0: now.getMonth() };
}

function monthParam(year: number, monthIndex0: number) {
  const normalized = new Date(year, monthIndex0, 1);
  return `${normalized.getFullYear()}-${String(normalized.getMonth() + 1).padStart(2, "0")}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
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

  const { year, monthIndex0 } = parseMonthParam(month, timeZone);
  const { start, end, days } = getMonthRangeUtc(timeZone, year, monthIndex0);
  const todayKey = dateKey(toZonedTime(new Date(), timeZone));

  const [{ data: items, error: itemsError }, { data: habits }, { data: habitLogs }] =
    await Promise.all([
      supabase
        .from("schedule_items")
        .select("id, type, status, scheduled_start")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .is("archived_at", null)
        .neq("type", "habit")
        .gte("scheduled_start", start.toISOString())
        .lte("scheduled_start", end.toISOString()),
      supabase
        .from("habits")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .is("paused_at", null),
      supabase
        .from("habit_logs")
        .select("logged_for_date, completed")
        .eq("user_id", user.id)
        .eq("completed", true)
        .gte("logged_for_date", dateKey(days[0]))
        .lte("logged_for_date", dateKey(days[days.length - 1])),
    ]);

  if (itemsError) {
    throw new Error(`Failed to load calendar: ${itemsError.message}`);
  }

  const activeHabitCount = habits?.length ?? 0;

  const tasksByDay = new Map<string, { total: number; done: number }>();
  for (const item of items ?? []) {
    if (!item.scheduled_start) continue;
    const key = dateKey(toZonedTime(new Date(item.scheduled_start), timeZone));
    const entry = tasksByDay.get(key) ?? { total: 0, done: 0 };
    entry.total += 1;
    if (item.status === "completed") entry.done += 1;
    tasksByDay.set(key, entry);
  }

  const habitsByDay = new Map<string, number>();
  for (const log of habitLogs ?? []) {
    habitsByDay.set(log.logged_for_date, (habitsByDay.get(log.logged_for_date) ?? 0) + 1);
  }

  const stats: DayCellStat[] = days.map((date) => {
    const key = dateKey(date);
    const taskEntry = tasksByDay.get(key) ?? { total: 0, done: 0 };
    return {
      key,
      dayOfMonth: date.getDate(),
      inMonth: date.getMonth() === monthIndex0,
      isToday: key === todayKey,
      isPast: key < todayKey,
      tasksTotal: taskEntry.total,
      tasksDone: taskEntry.done,
      habitTotal: activeHabitCount,
      habitDone: Math.min(activeHabitCount, habitsByDay.get(key) ?? 0),
    };
  });

  const prevMonth = monthParam(year, monthIndex0 - 1);
  const nextMonth = monthParam(year, monthIndex0 + 1);

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">
            {MONTH_LABEL.format(new Date(year, monthIndex0, 1))}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/calendar?month=${prevMonth}`} aria-label="Previous month">
              <ChevronLeftIcon className="size-4" />
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/calendar">Today</Link>
          </Button>
          <Button variant="outline" size="icon" asChild>
            <Link href={`/calendar?month=${nextMonth}`} aria-label="Next month">
              <ChevronRightIcon className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      <MonthGrid stats={stats} />
    </div>
  );
}
