import type { Metadata } from "next";
import { ListChecksIcon } from "lucide-react";

import { AddHabitDialog } from "@/components/habits/add-habit-dialog";
import { HabitCard } from "@/components/habits/habit-card";
import { EmptyState } from "@/components/shared/empty-state";
import { getHabitsWithStreaks } from "@/lib/habits/get-habits-with-streaks";
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
  const habitsWithStreaks = await getHabitsWithStreaks(supabase, user.id, timeZone);

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

      {habitsWithStreaks.length === 0 ? (
        <EmptyState
          icon={ListChecksIcon}
          title="No habits yet"
          description="Add sleep, gym, water, reading, meditation, or walking and LifeFlow will track streaks for you."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {habitsWithStreaks.map(({ habit, streak, isCompletedToday }) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              streak={streak}
              isCompletedToday={isCompletedToday}
              dateKey={todayKey}
            />
          ))}
        </div>
      )}
    </div>
  );
}
