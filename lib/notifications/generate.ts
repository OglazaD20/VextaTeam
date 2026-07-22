import { getTodayRangeUtc, getWakingWindowUtc } from "@/lib/scheduling/day-range";
import { computeFreeGaps } from "@/lib/scheduling/gaps";
import { computeGoalProgressPct } from "@/lib/goals/progress";
import { getTodayKey } from "@/lib/habits/today-key";
import { isNotificationEnabled } from "@/lib/notifications/preferences";
import { sendPushToUser } from "@/lib/notifications/push";
import type { createClient } from "@/lib/supabase/server";
import type { NotificationType } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const FREE_TIME_THRESHOLD_MINUTES = 45;
const BREAK_REMINDER_THRESHOLD_MINUTES = 120;
const HABIT_SKIP_GRACE_HOUR = 20; // 8pm local
const DEDUPE_WINDOW_HOURS = 3;
const UPCOMING_TASK_WINDOW_MINUTES = 15;
const UPCOMING_CALENDAR_WINDOW_MINUTES = 30;
const BEDTIME_WINDOW_MINUTES = 45;
const GOAL_DEADLINE_WINDOW_DAYS = 3;
const FINANCE_DUE_WINDOW_DAYS = 3;
const WATER_REMINDER_HOUR = 14; // 2pm local
const WATER_REMINDER_FRACTION = 0.5;

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

/** Inserts a notification (if the user hasn't disabled that category) and best-effort pushes it. */
async function notifyUser(
  supabase: SupabaseServerClient,
  userId: string,
  timeZone: string,
  prefs: Record<string, boolean>,
  notification: { type: NotificationType; title: string; body: string; relatedItemId?: string },
): Promise<void> {
  if (!isNotificationEnabled(prefs, notification.type)) return;

  await supabase.from("notifications").insert({
    user_id: userId,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    related_item_id: notification.relatedItemId ?? null,
  });

  await sendPushToUser(supabase, userId, timeZone, {
    title: notification.title,
    body: notification.body,
  });
}

/**
 * Computes contextual notifications from data already in the schedule —
 * no weather/traffic API required. Called opportunistically on page load
 * (see app/(app)/layout.tsx) rather than via a background cron job, since
 * the Hobby-tier Vercel plan this project runs on only allows daily cron
 * schedules, which is too coarse for "you have free time this afternoon."
 * The same reasoning applies to every check below, including the newer
 * ones (bedtime, meals, water, goals, bills) — each evaluates "is this true
 * right now" rather than firing on a fixed schedule.
 */
export async function generateContextualNotifications(
  supabase: SupabaseServerClient,
  userId: string,
  timeZone: string,
): Promise<void> {
  const now = new Date();
  const nowMs = now.getTime();

  const [{ data: settings }, { data: todayItems }] = await Promise.all([
    supabase
      .from("user_settings")
      .select("wake_time, sleep_time, notification_prefs")
      .eq("user_id", userId)
      .single(),
    supabase
      .from("schedule_items")
      .select("id, title, scheduled_start, scheduled_end, status, source")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .gte("scheduled_start", getTodayRangeUtc(timeZone, now).start.toISOString())
      .lte("scheduled_start", getTodayRangeUtc(timeZone, now).end.toISOString()),
  ]);

  const items = todayItems ?? [];
  const prefs = settings?.notification_prefs ?? {};

  // 1. Free time remaining today.
  const dayWindow = getWakingWindowUtc(
    timeZone,
    settings?.wake_time ?? "07:00",
    settings?.sleep_time ?? "23:00",
    now,
  );
  if (nowMs < dayWindow.end.getTime()) {
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
      await notifyUser(supabase, userId, timeZone, prefs, {
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
      await notifyUser(supabase, userId, timeZone, prefs, {
        type: "break_reminder",
        title: "Take a break",
        body: `"${inProgress.title}" is a long block — consider stepping away for a few minutes.`,
        relatedItemId: inProgress.id,
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
    const habitIds = (habits ?? []).map((h) => h.id);

    if (habitIds.length > 0) {
      const [{ data: logs }, { data: existingNotifications }] = await Promise.all([
        supabase
          .from("habit_logs")
          .select("habit_id")
          .in("habit_id", habitIds)
          .eq("logged_for_date", todayKey)
          .eq("completed", true),
        // related_item_id is a schedule_items FK, not usable for habits — dedupe
        // by matching today's habit_skip notifications on the habit's name instead.
        supabase
          .from("notifications")
          .select("body")
          .eq("user_id", userId)
          .eq("type", "habit_skip")
          .gte("created_at", todayStart.toISOString()),
      ]);

      const loggedHabitIds = new Set((logs ?? []).map((l) => l.habit_id));
      const alreadyNotifiedNames = new Set(
        (existingNotifications ?? [])
          .map((n) => /"([^"]+)"/.exec(n.body)?.[1])
          .filter((name): name is string => Boolean(name)),
      );

      const toNotify = (habits ?? []).filter(
        (habit) => !loggedHabitIds.has(habit.id) && !alreadyNotifiedNames.has(habit.name),
      );

      for (const habit of toNotify) {
        await notifyUser(supabase, userId, timeZone, prefs, {
          type: "habit_skip",
          title: "Don't break your streak",
          body: `You haven't logged "${habit.name}" yet today.`,
        });
      }
    }
  }

  // 4/10. Upcoming task or calendar event starting soon.
  const upcoming = items
    .filter((item) => item.status !== "completed" && item.scheduled_start)
    .filter((item) => {
      const startMs = new Date(item.scheduled_start!).getTime();
      return startMs > nowMs && startMs - nowMs <= UPCOMING_CALENDAR_WINDOW_MINUTES * 60_000;
    })
    .sort((a, b) => new Date(a.scheduled_start!).getTime() - new Date(b.scheduled_start!).getTime());

  const upcomingCalendarEvent = upcoming.find((item) => item.source === "google");
  const upcomingTask = upcoming.find(
    (item) =>
      item.source !== "google" &&
      new Date(item.scheduled_start!).getTime() - nowMs <= UPCOMING_TASK_WINDOW_MINUTES * 60_000,
  );

  if (upcomingTask && !(await alreadyNotifiedRecently(supabase, userId, "task_reminder", upcomingTask.id, DEDUPE_WINDOW_HOURS))) {
    const minutesAway = Math.round((new Date(upcomingTask.scheduled_start!).getTime() - nowMs) / 60_000);
    await notifyUser(supabase, userId, timeZone, prefs, {
      type: "task_reminder",
      title: "Coming up",
      body: `"${upcomingTask.title}" starts in ${Math.max(1, minutesAway)} min.`,
      relatedItemId: upcomingTask.id,
    });
  }

  if (
    upcomingCalendarEvent &&
    !(await alreadyNotifiedRecently(supabase, userId, "calendar_reminder", upcomingCalendarEvent.id, DEDUPE_WINDOW_HOURS))
  ) {
    const minutesAway = Math.round((new Date(upcomingCalendarEvent.scheduled_start!).getTime() - nowMs) / 60_000);
    await notifyUser(supabase, userId, timeZone, prefs, {
      type: "calendar_reminder",
      title: "Calendar event soon",
      body: `"${upcomingCalendarEvent.title}" starts in ${Math.max(1, minutesAway)} min.`,
      relatedItemId: upcomingCalendarEvent.id,
    });
  }

  // 5. Bedtime approaching.
  const sleepTime = settings?.sleep_time ?? "23:00";
  const minutesToBedtime = (dayWindow.end.getTime() - nowMs) / 60_000;
  if (
    minutesToBedtime > 0 &&
    minutesToBedtime <= BEDTIME_WINDOW_MINUTES &&
    !(await alreadyNotifiedRecently(supabase, userId, "bedtime_reminder", null, 12))
  ) {
    await notifyUser(supabase, userId, timeZone, prefs, {
      type: "bedtime_reminder",
      title: "Bedtime coming up",
      body: `Your usual bedtime (${sleepTime.slice(0, 5)}) is in about ${Math.round(minutesToBedtime)} min.`,
    });
  }

  // 6. Water intake behind goal in the afternoon/evening.
  if (nowInZoneHour >= WATER_REMINDER_HOUR && !(await alreadyNotifiedRecently(supabase, userId, "water_reminder", null, DEDUPE_WINDOW_HOURS))) {
    const { start: todayStart, end: todayEnd } = getTodayRangeUtc(timeZone, now);
    const [{ data: waterLogs }, { data: nutritionSettings }] = await Promise.all([
      supabase
        .from("water_logs")
        .select("amount_ml")
        .eq("user_id", userId)
        .gte("logged_at", todayStart.toISOString())
        .lte("logged_at", todayEnd.toISOString()),
      supabase.from("nutrition_settings").select("water_goal_ml").eq("user_id", userId).maybeSingle(),
    ]);
    const totalMl = (waterLogs ?? []).reduce((sum, w) => sum + w.amount_ml, 0);
    const goalMl = nutritionSettings?.water_goal_ml ?? 2000;
    if (totalMl < goalMl * WATER_REMINDER_FRACTION) {
      await notifyUser(supabase, userId, timeZone, prefs, {
        type: "water_reminder",
        title: "Drink some water",
        body: `You've had ${totalMl}ml of your ${goalMl}ml goal so far today.`,
      });
    }
  }

  // 7. Meal not logged around typical mealtimes.
  const mealWindows: { hour: number; meal: "lunch" | "dinner" }[] = [
    { hour: 15, meal: "lunch" },
    { hour: 21, meal: "dinner" },
  ];
  const dueMeal = mealWindows.find((w) => nowInZoneHour === w.hour);
  if (dueMeal && !(await alreadyNotifiedRecently(supabase, userId, "meal_reminder", null, DEDUPE_WINDOW_HOURS))) {
    const { start: todayStart, end: todayEnd } = getTodayRangeUtc(timeZone, now);
    const { data: mealLogs } = await supabase
      .from("food_logs")
      .select("id")
      .eq("user_id", userId)
      .eq("meal_type", dueMeal.meal)
      .gte("logged_at", todayStart.toISOString())
      .lte("logged_at", todayEnd.toISOString())
      .limit(1);

    if (!mealLogs || mealLogs.length === 0) {
      await notifyUser(supabase, userId, timeZone, prefs, {
        type: "meal_reminder",
        title: `Did you have ${dueMeal.meal}?`,
        body: `You haven't logged ${dueMeal.meal} yet today.`,
      });
    }
  }

  // 8. Goal deadlines coming up with little progress.
  // related_item_id is a schedule_items FK, not usable for goals — dedupe by
  // matching today's goal_reminder notifications on the goal's title instead
  // (same pattern as habit_skip above).
  const { data: goals } = await supabase
    .from("goals")
    .select("id, title, deadline, target_value, current_value, manual_progress_pct")
    .eq("user_id", userId)
    .eq("status", "active")
    .not("deadline", "is", null);

  if (goals && goals.length > 0) {
    const { data: recentGoalNotifications } = await supabase
      .from("notifications")
      .select("body")
      .eq("user_id", userId)
      .eq("type", "goal_reminder")
      .gte("created_at", new Date(nowMs - 24 * 60 * 60 * 1000).toISOString());
    const recentlyNotifiedTitles = new Set(
      (recentGoalNotifications ?? []).map((n) => /"([^"]+)"/.exec(n.body)?.[1]).filter((t): t is string => Boolean(t)),
    );

    for (const goal of goals) {
      const daysLeft = (new Date(goal.deadline!).getTime() - nowMs) / (24 * 60 * 60 * 1000);
      if (daysLeft < 0 || daysLeft > GOAL_DEADLINE_WINDOW_DAYS) continue;
      if (recentlyNotifiedTitles.has(goal.title)) continue;

      const progressPct = computeGoalProgressPct({
        targetValue: goal.target_value,
        currentValue: goal.current_value,
        manualProgressPct: goal.manual_progress_pct,
        milestones: [],
      });
      if (progressPct >= 80) continue;

      await notifyUser(supabase, userId, timeZone, prefs, {
        type: "goal_reminder",
        title: "Goal deadline approaching",
        body: `"${goal.title}" is due in ${Math.max(0, Math.round(daysLeft))} day(s) and ${progressPct}% done.`,
      });
    }
  }

  // 9. Subscriptions/bills due soon (same related_item_id FK constraint as above).
  const { data: subscriptions } = await supabase
    .from("finance_subscriptions")
    .select("id, name, next_billing_date")
    .eq("user_id", userId)
    .eq("is_active", true)
    .not("next_billing_date", "is", null);

  if (subscriptions && subscriptions.length > 0) {
    const { data: recentFinanceNotifications } = await supabase
      .from("notifications")
      .select("body")
      .eq("user_id", userId)
      .eq("type", "finance_reminder")
      .gte("created_at", new Date(nowMs - 24 * 60 * 60 * 1000).toISOString());
    const recentlyNotifiedNames = new Set(
      (recentFinanceNotifications ?? []).map((n) => /"([^"]+)"/.exec(n.body)?.[1]).filter((t): t is string => Boolean(t)),
    );

    for (const sub of subscriptions) {
      const daysLeft = (new Date(sub.next_billing_date!).getTime() - nowMs) / (24 * 60 * 60 * 1000);
      if (daysLeft < 0 || daysLeft > FINANCE_DUE_WINDOW_DAYS) continue;
      if (recentlyNotifiedNames.has(sub.name)) continue;

      await notifyUser(supabase, userId, timeZone, prefs, {
        type: "finance_reminder",
        title: "Bill due soon",
        body: `"${sub.name}" is due in ${Math.max(0, Math.round(daysLeft))} day(s).`,
      });
    }
  }
}
