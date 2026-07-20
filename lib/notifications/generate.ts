import { getTodayRangeUtc, getWakingWindowUtc } from "@/lib/scheduling/day-range";
import { computeFreeGaps } from "@/lib/scheduling/gaps";
import { getTodayKey } from "@/lib/habits/today-key";
import type { createClient } from "@/lib/supabase/server";
import type { NotificationType } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const FREE_TIME_THRESHOLD_MINUTES = 45;
const BREAK_REMINDER_THRESHOLD_MINUTES = 120;
const HABIT_SKIP_GRACE_HOUR = 20; // 8pm local
const DEDUPE_WINDOW_HOURS = 3;

async function alreadyNotifiedRecently(
  supabase: SupabaseServerClient,
  userId: string,
  type: NotificationType,
  relatedItemId: string | null,
  sinceHours: number,
) {
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString();
  let query = supabase
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", type)
    .gte("created_at", since)
    .limit(1);

  query = relatedItemId ? query.eq("related_item_id", relatedItemId) : query.is("related_item_id", null);

  const { data } = await query;
  return (data?.length ?? 0) > 0;
}

/**
 * Computes contextual notifications from data already in the schedule —
 * no weather/traffic API required. Called opportunistically on page load
 * (see app/(app)/layout.tsx) rather than via a background cron job, since
 * the Hobby-tier Vercel plan this project runs on only allows daily cron
 * schedules, which is too coarse for "you have free time this afternoon."
 */
export async function generateContextualNotifications(
  supabase: SupabaseServerClient,
  userId: string,
  timeZone: string,
): Promise<void> {
  const now = new Date();

  const [{ data: settings }, { data: todayItems }] = await Promise.all([
    supabase
      .from("user_settings")
      .select("wake_time, sleep_time")
      .eq("user_id", userId)
      .single(),
    supabase
      .from("schedule_items")
      .select("id, title, scheduled_start, scheduled_end, status")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .gte("scheduled_start", getTodayRangeUtc(timeZone, now).start.toISOString())
      .lte("scheduled_start", getTodayRangeUtc(timeZone, now).end.toISOString()),
  ]);

  const items = todayItems ?? [];

  // 1. Free time remaining today.
  const dayWindow = getWakingWindowUtc(
    timeZone,
    settings?.wake_time ?? "07:00",
    settings?.sleep_time ?? "23:00",
    now,
  );
  if (now.getTime() < dayWindow.end.getTime()) {
    const remainingWindow = { start: now, end: dayWindow.end };
    const busy = items
      .filter((item) => item.scheduled_start && item.scheduled_end)
      .map((item) => ({
        start: new Date(item.scheduled_start!),
        end: new Date(item.scheduled_end!),
      }));
    const freeMinutes = computeFreeGaps(remainingWindow, busy).reduce(
      (sum, gap) => sum + (gap.end.getTime() - gap.start.getTime()) / 60_000,
      0,
    );

    if (
      freeMinutes >= FREE_TIME_THRESHOLD_MINUTES &&
      !(await alreadyNotifiedRecently(supabase, userId, "free_time", null, DEDUPE_WINDOW_HOURS))
    ) {
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "free_time",
        title: "You have free time today",
        body: `You still have about ${Math.round(freeMinutes)} minutes free today.`,
      });
    }
  }

  // 2. Long-running item in progress — suggest a break.
  const inProgress = items.find(
    (item) =>
      item.status !== "completed" &&
      item.scheduled_start &&
      item.scheduled_end &&
      new Date(item.scheduled_start) <= now &&
      new Date(item.scheduled_end) > now,
  );
  if (inProgress) {
    const durationMinutes =
      (new Date(inProgress.scheduled_end!).getTime() - new Date(inProgress.scheduled_start!).getTime()) /
      60_000;
    if (
      durationMinutes >= BREAK_REMINDER_THRESHOLD_MINUTES &&
      !(await alreadyNotifiedRecently(
        supabase,
        userId,
        "break_reminder",
        inProgress.id,
        DEDUPE_WINDOW_HOURS,
      ))
    ) {
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "break_reminder",
        title: "Take a break",
        body: `"${inProgress.title}" is a long block — consider stepping away for a few minutes.`,
        related_item_id: inProgress.id,
      });
    }
  }

  // 3. Habits not logged today, past the grace hour.
  const nowInZoneHour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hour12: false }).format(now),
  );
  if (nowInZoneHour >= HABIT_SKIP_GRACE_HOUR) {
    const { data: habits } = await supabase
      .from("habits")
      .select("id, name")
      .eq("user_id", userId)
      .eq("is_active", true)
      .eq("cadence", "daily");

    const todayKey = getTodayKey(timeZone, now);
    const { start: todayStart } = getTodayRangeUtc(timeZone, now);

    for (const habit of habits ?? []) {
      const { data: log } = await supabase
        .from("habit_logs")
        .select("id")
        .eq("habit_id", habit.id)
        .eq("logged_for_date", todayKey)
        .eq("completed", true)
        .maybeSingle();

      if (log) continue;

      // related_item_id is a schedule_items FK, not usable for habits — dedupe
      // by matching today's habit_skip notifications on the habit's name instead.
      const { data: existingNotification } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", userId)
        .eq("type", "habit_skip")
        .gte("created_at", todayStart.toISOString())
        .ilike("body", `%"${habit.name}"%`)
        .limit(1);

      if (!existingNotification || existingNotification.length === 0) {
        await supabase.from("notifications").insert({
          user_id: userId,
          type: "habit_skip",
          title: "Don't break your streak",
          body: `You haven't logged "${habit.name}" yet today.`,
        });
      }
    }
  }
}
