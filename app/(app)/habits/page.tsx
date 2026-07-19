import type { Metadata } from "next";
import { ListChecksIcon } from "lucide-react";

import { AddHabitDialog } from "@/components/habits/add-habit-dialog";
import { HabitCard } from "@/components/habits/habit-card";
import { EmptyState } from "@/components/shared/empty-state";
import { computeStreak } from "@/lib/habits/streak";
import { getTodayKey } from "@/lib/habits/today-key";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Habits — LifeFlow" };

export default async function HabitsPage() {
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
  const todayKey = getTodayKey(timeZone);

  const { data: habits, error: habitsError } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (habitsError) {
    throw new Error(`Failed to load habits: ${habitsError.message}`);
  }

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const { data: logs, error: logsError } = await supabase
    .from("habit_logs")
    .select("habit_id, logged_for_date, completed")
    .eq("user_id", user.id)
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

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Habits</h1>
          <p className="text-sm text-muted-foreground">
            Small routines, tracked automatically.
          </p>
        </div>
        <AddHabitDialog />
      </div>

      {!habits || habits.length === 0 ? (
        <EmptyState
          icon={ListChecksIcon}
          title="No habits yet"
          description="Add sleep, gym, water, reading, meditation, or walking and LifeFlow will track streaks for you."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {habits.map((habit) => {
            const completedDates =
              completedDatesByHabit.get(habit.id) ?? new Set<string>();
            return (
              <HabitCard
                key={habit.id}
                habit={habit}
                streak={computeStreak(completedDates, timeZone)}
                isCompletedToday={completedDates.has(todayKey)}
                dateKey={todayKey}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
