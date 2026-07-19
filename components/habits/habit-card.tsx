"use client";

import { useTransition } from "react";
import { CheckIcon, FlameIcon, MoreHorizontalIcon, ArchiveIcon } from "lucide-react";
import { toast } from "sonner";

import { archiveHabit, toggleHabitLog } from "@/app/(app)/habits/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HABIT_CATEGORY_ICON } from "@/lib/habits/category-style";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";

export function HabitCard({
  habit,
  streak,
  isCompletedToday,
  dateKey,
}: {
  habit: Tables<"habits">;
  streak: number;
  isCompletedToday: boolean;
  dateKey: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleHabitLog(habit.id, dateKey);
      if (result.error) {
        toast.error("Couldn't update that habit", { description: result.error });
      }
    });
  }

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveHabit(habit.id);
      if (result.error) {
        toast.error("Couldn't archive that habit", { description: result.error });
      } else {
        toast.success("Habit archived");
      }
    });
  }

  return (
    <div
      className={cn(
        "group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-opacity",
        isPending && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-2xl">{HABIT_CATEGORY_ICON[habit.category ?? "custom"]}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="More actions"
              className="rounded-full p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
            >
              <MoreHorizontalIcon className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" onClick={handleArchive}>
              <ArchiveIcon /> Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div>
        <p className="font-medium">{habit.name}</p>
        <p className="text-xs text-muted-foreground">
          {habit.target_value
            ? `Target: ${habit.target_value}${habit.target_unit ? ` ${habit.target_unit}` : ""} / ${habit.cadence}`
            : habit.cadence === "daily"
              ? "Daily"
              : "Weekly"}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          {streak > 0 && (
            <>
              <FlameIcon className="size-4 text-warning" />
              <span>{streak}-day streak</span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
            isCompletedToday
              ? "border-success bg-success/15 text-success"
              : "border-border text-muted-foreground hover:border-primary hover:text-primary",
          )}
        >
          <CheckIcon className="size-3.5" strokeWidth={3} />
          {isCompletedToday ? "Done" : "Mark done"}
        </button>
      </div>
    </div>
  );
}
