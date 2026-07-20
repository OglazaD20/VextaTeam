"use client";

import * as React from "react";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDownIcon, PauseIcon } from "lucide-react";
import { toast } from "sonner";

import { reorderHabits, resumeHabit } from "@/app/(app)/habits/actions";
import { HabitCard } from "@/components/habits/habit-card";
import { HABIT_CATEGORY_ICON } from "@/lib/habits/category-style";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";

type HabitEntry = { habit: Tables<"habits">; streak: number; isCompletedToday: boolean };

function SortableHabitCard({ entry, dateKey }: { entry: HabitEntry; dateKey: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.habit.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <HabitCard
        habit={entry.habit}
        streak={entry.streak}
        isCompletedToday={entry.isCompletedToday}
        dateKey={dateKey}
        dragHandleProps={{ attributes, listeners: listeners ?? {} }}
      />
    </div>
  );
}

function PausedHabitsSection({ entries }: { entries: HabitEntry[] }) {
  const [isOpen, setIsOpen] = React.useState(false);

  if (entries.length === 0) return null;

  async function handleResume(id: string) {
    const result = await resumeHabit(id);
    if (result.error) {
      toast.error("Couldn't resume that habit", { description: result.error });
    } else {
      toast.success("Habit resumed");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <PauseIcon className="size-3.5" />
        Paused ({entries.length})
        <ChevronDownIcon className={cn("size-3.5 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="flex flex-col gap-1.5">
          {entries.map(({ habit }) => (
            <div
              key={habit.id}
              className="flex items-center justify-between rounded-xl border border-border px-3.5 py-2 text-sm text-muted-foreground"
            >
              <span className="flex items-center gap-2 truncate">
                <span>{HABIT_CATEGORY_ICON[habit.category ?? "custom"]}</span>
                {habit.name}
              </span>
              <button
                type="button"
                onClick={() => handleResume(habit.id)}
                className="shrink-0 text-xs hover:text-foreground"
              >
                Resume
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function HabitList({ entries, dateKey }: { entries: HabitEntry[]; dateKey: string }) {
  const active = React.useMemo(() => entries.filter((e) => !e.habit.paused_at), [entries]);
  const paused = React.useMemo(() => entries.filter((e) => e.habit.paused_at), [entries]);

  const [orderedActive, setOrderedActive] = React.useState(active);
  const [syncedActive, setSyncedActive] = React.useState(active);
  // Adjust local drag state when the server-provided list changes, without an
  // effect (React's recommended pattern for syncing state from props).
  if (active !== syncedActive) {
    setSyncedActive(active);
    setOrderedActive(active);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active: activeItem, over } = event;
    if (!over || activeItem.id === over.id) return;

    const oldIndex = orderedActive.findIndex((e) => e.habit.id === activeItem.id);
    const newIndex = orderedActive.findIndex((e) => e.habit.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = [...orderedActive];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    setOrderedActive(next);
    void reorderHabits(next.map((e) => e.habit.id));
  }

  return (
    <div className="flex flex-col gap-6">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={orderedActive.map((e) => e.habit.id)} strategy={rectSortingStrategy}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orderedActive.map((entry) => (
              <SortableHabitCard key={entry.habit.id} entry={entry} dateKey={dateKey} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <PausedHabitsSection entries={paused} />
    </div>
  );
}
