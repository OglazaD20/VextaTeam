import { FlameIcon } from "lucide-react";

import { HABIT_CATEGORY_ICON } from "@/lib/habits/category-style";
import type { Tables } from "@/types/database";

export function HabitStreakList({
  items,
}: {
  items: { habit: Tables<"habits">; streak: number }[];
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add a habit to start tracking streaks.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map(({ habit, streak }) => (
        <div
          key={habit.id}
          className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5 text-sm"
        >
          <span className="flex items-center gap-2">
            <span>{HABIT_CATEGORY_ICON[habit.category ?? "custom"]}</span>
            {habit.name}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            {streak > 0 && <FlameIcon className="size-3.5 text-warning" />}
            {streak} {streak === 1 ? "day" : "days"}
          </span>
        </div>
      ))}
    </div>
  );
}
