import type { createClient } from "@/lib/supabase/server";
import { computeStreak } from "./streak";
import { getTodayKey } from "./today-key";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function getHabitsWithStreaks(
  supabase: SupabaseServerClient,
  userId: string,
  timeZone: string,
) {
  const todayKey = getTodayKey(timeZone);

  const { data: habits, error: habitsError } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (habitsError) {
    throw new Error(`Failed to load habits: ${habitsError.message}`);
  }

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const { data: logs, error: logsError } = await supabase
    .from("habit_logs")
    .select("habit_id, logged_for_date, completed")
    .eq("user_id", userId)
    .gte("logged_for_date", sixtyDaysAgo.toISOString().slice(0, 10));

  if (logsError) {
    throw new Error(`Failed to load habit history: ${logsError.message}`);
  }

  const completedDatesByHabit = new Map<string, Set<string>>();
  for (const log of logs ?? []) {
    if (!log.completed) continue;
    if (!completedDatesByHabit.has(log.habit_id)) {
      completedDatesByHabit.set(log.habit_id, new Set());
    }
    completedDatesByHabit.get(log.habit_id)!.add(log.logged_for_date);
  }

  return (habits ?? []).map((habit) => {
    const completedDates = completedDatesByHabit.get(habit.id) ?? new Set<string>();
    return {
      habit,
      streak: computeStreak(completedDates, timeZone),
      isCompletedToday: completedDates.has(todayKey),
    };
  });
}
