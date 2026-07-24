"use client";

import * as React from "react";
import { useTransition } from "react";
import {
  ArchiveIcon,
  BellIcon,
  CheckIcon,
  FlameIcon,
  GripVerticalIcon,
  MoreHorizontalIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
} from "lucide-react";
import { toast } from "sonner";

import { archiveHabit, pauseHabit, resumeHabit, toggleHabitLog } from "@/app/(app)/habits/actions";
import { HabitEditorDialog } from "@/components/habits/habit-editor-dialog";
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
  dragHandleProps,
}: {
  habit: Tables<"habits">;
  streak: number;
  isCompletedToday: boolean;
  dateKey: string;
  dragHandleProps?: {
    attributes: React.HTMLAttributes<HTMLButtonElement>;
    listeners: Record<string, unknown>;
  };
}) {
  const [isPending, startTransition] = useTransition();
  const [isEditorOpen, setEditorOpen] = React.useState(false);
  const isPaused = !!habit.paused_at;

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

  function handlePauseToggle() {
    startTransition(async () => {
      const result = isPaused ? await resumeHabit(habit.id) : await pauseHabit(habit.id);
      if (result.error) {
        toast.error("Couldn't update that habit", { description: result.error });
      } else {
        toast.success(isPaused ? "Habit resumed" : "Habit paused");
      }
    });
  }

  return (
    <div
      className={cn(
        "group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-opacity",
        (isPending || isPaused) && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1.5">
          {dragHandleProps && (
            <button
              type="button"
              className="cursor-grab touch-none text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
              aria-label="Drag to reorder"
              {...dragHandleProps.attributes}
              {...dragHandleProps.listeners}
            >
              <GripVerticalIcon className="size-4" />
            </button>
          )}
          <span className="text-2xl">{HABIT_CATEGORY_ICON[habit.category ?? "custom"]}</span>
        </div>
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
            <DropdownMenuItem onClick={() => setEditorOpen(true)}>
              <PencilIcon /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePauseToggle}>
              {isPaused ? <PlayIcon /> : <PauseIcon />}
              {isPaused ? "Resume" : "Pause"}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={handleArchive}>
              <ArchiveIcon /> Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div>
        <div className="flex items-center gap-1.5">
          <p className="font-medium">{habit.name}</p>
          {habit.reminder_enabled && (
            <BellIcon className="size-3.5 text-muted-foreground" aria-label="Reminders on" />
          )}
          {isPaused && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              Paused
            </span>
          )}
        </div>
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
          disabled={isPending || isPaused}
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

      <HabitEditorDialog open={isEditorOpen} onOpenChange={setEditorOpen} habit={habit} />
    </div>
  );
}
