"use client";

import * as React from "react";
import { useTransition } from "react";
import {
  ArchiveIcon,
  CalendarDaysIcon,
  CheckIcon,
  CopyIcon,
  GripVerticalIcon,
  MapPinIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
  UndoIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  archiveTask,
  deleteScheduleItem,
  duplicateTask,
  setScheduleItemStatus,
} from "@/app/(app)/today/actions";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfettiBurst } from "@/components/shared/confetti-burst";
import { TaskEditorDialog } from "@/components/tasks/task-editor-dialog";
import { MoveToDayDialog } from "@/components/tasks/move-to-day-dialog";
import { CATEGORY_LABEL, CATEGORY_VAR } from "@/lib/scheduling/category-style";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";

const SWIPE_COMPLETE_THRESHOLD_PX = 88;
const LONG_PRESS_MS = 500;

function formatTimeRange(start: string | null, end: string | null, timeZone: string) {
  if (!start) return null;
  const formatter = new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  });
  const startLabel = formatter.format(new Date(start));
  if (!end) return startLabel;
  return `${startLabel} – ${formatter.format(new Date(end))}`;
}

function formatDueDate(dueAt: string | null) {
  if (!dueAt) return null;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(dueAt),
  );
}

export function ScheduleBlock({
  item,
  allTags = [],
  dragHandleProps,
  selectable = false,
  selected = false,
  onToggleSelected,
  timeZone,
}: {
  item: Tables<"schedule_items">;
  allTags?: string[];
  dragHandleProps?: {
    attributes: React.HTMLAttributes<HTMLButtonElement>;
    listeners: Record<string, unknown>;
  };
  /** Bulk-selection mode (see UnscheduledList) — replaces the complete toggle with a plain checkbox. */
  selectable?: boolean;
  selected?: boolean;
  onToggleSelected?: () => void;
  timeZone: string;
}) {
  const [, startTransition] = useTransition();
  const [isEditorOpen, setEditorOpen] = React.useState(false);
  const [isMoveOpen, setMoveOpen] = React.useState(false);
  // Optimistic — flips instantly on click/swipe rather than waiting on the
  // server round-trip, then reconciles (reverts + toasts) only on failure.
  const [isCompleted, setIsCompleted] = React.useState(item.status === "completed");
  const [celebrate, setCelebrate] = React.useState(false);
  const [swipeX, setSwipeX] = React.useState(0);
  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeStartX = React.useRef<number | null>(null);
  const [menuOpen, setMenuOpen] = React.useState(false);

  // Re-syncs local optimistic state when the server-provided status changes
  // (e.g. after a revalidate), without an effect — React's recommended
  // pattern for syncing state from props.
  const [syncedStatus, setSyncedStatus] = React.useState(item.status);
  if (item.status !== syncedStatus) {
    setSyncedStatus(item.status);
    setIsCompleted(item.status === "completed");
  }

  function commitStatus(nextCompleted: boolean) {
    const previous = isCompleted;
    setIsCompleted(nextCompleted);

    if (nextCompleted && item.priority <= 2) {
      setCelebrate(true);
    }

    startTransition(async () => {
      const result = await setScheduleItemStatus(item.id, nextCompleted ? "completed" : "planned");
      if (result.error) {
        setIsCompleted(previous);
        toast.error("Couldn't update that", { description: result.error });
        return;
      }
      if (nextCompleted) {
        toast.success(`"${item.title}" completed`, {
          action: {
            label: "Undo",
            onClick: () => {
              setIsCompleted(false);
              void setScheduleItemStatus(item.id, "planned");
            },
          },
        });
      }
    });
  }

  function handleToggleComplete() {
    commitStatus(!isCompleted);
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteScheduleItem(item.id);
      if (result.error) {
        toast.error("Couldn't delete that", { description: result.error });
      } else {
        toast.success("Removed from your day");
      }
    });
  }

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateTask(item.id);
      if (result.error) {
        toast.error("Couldn't duplicate that", { description: result.error });
      } else {
        toast.success("Task duplicated");
      }
    });
  }

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveTask(item.id);
      if (result.error) {
        toast.error("Couldn't archive that", { description: result.error });
      } else {
        toast.success("Task archived");
      }
    });
  }

  function handlePointerDown(event: React.PointerEvent) {
    if (selectable) return;
    swipeStartX.current = event.clientX;
    longPressTimer.current = setTimeout(() => setMenuOpen(true), LONG_PRESS_MS);
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (swipeStartX.current === null) return;
    const delta = event.clientX - swipeStartX.current;
    // Any real movement cancels the long-press timer (matches the map's own
    // press-vs-drag disambiguation) so a swipe never also opens the menu.
    if (Math.abs(delta) > 8 && longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (delta > 0 && !isCompleted) {
      setSwipeX(Math.min(delta, SWIPE_COMPLETE_THRESHOLD_PX * 1.4));
    }
  }

  function handlePointerUp() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    swipeStartX.current = null;
    if (swipeX >= SWIPE_COMPLETE_THRESHOLD_PX) {
      commitStatus(true);
    }
    setSwipeX(0);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key.toLowerCase() === "c" && !selectable) {
      event.preventDefault();
      handleToggleComplete();
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <ConfettiBurst fire={celebrate} />
      {/* Swipe-to-complete reveal — sits behind the row, visible once dragged. */}
      <div
        className="absolute inset-y-0 left-0 flex items-center gap-1.5 rounded-2xl bg-success px-4 text-sm font-medium text-white"
        style={{ width: SWIPE_COMPLETE_THRESHOLD_PX * 1.4, opacity: swipeX > 4 ? 1 : 0 }}
        aria-hidden="true"
      >
        <CheckIcon className="size-4" /> Done
      </div>

      <div
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ transform: `translateX(${swipeX}px)`, touchAction: "pan-y" }}
        className="group relative flex items-start gap-2 rounded-2xl border border-border bg-card p-4 pl-4 shadow-sm transition-transform"
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{ borderLeft: `3px solid ${CATEGORY_VAR[item.type]}` }}
        />

        {dragHandleProps && (
          <button
            type="button"
            className="mt-0.5 shrink-0 cursor-grab touch-none text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
            aria-label="Drag to reorder"
            {...dragHandleProps.attributes}
            {...dragHandleProps.listeners}
          >
            <GripVerticalIcon className="size-4" />
          </button>
        )}

        {selectable ? (
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelected}
            className="mt-1 size-6 shrink-0"
            aria-label={`Select "${item.title}"`}
          />
        ) : (
          <button
            type="button"
            onClick={handleToggleComplete}
            aria-label={isCompleted ? "Mark as not done" : "Mark as done"}
            className={cn(
              "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-all active:scale-90",
              isCompleted
                ? "border-success bg-success text-white"
                : "border-border text-transparent hover:border-primary hover:bg-primary/5",
            )}
          >
            <CheckIcon className="size-4" strokeWidth={3} />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={cn(
                "text-sm font-medium transition-colors",
                isCompleted && "text-muted-foreground line-through",
              )}
            >
              {item.title}
            </p>
            <Badge variant="outline" className="text-[10px]">
              {CATEGORY_LABEL[item.type]}
            </Badge>
            {item.category && (
              <Badge variant="secondary" className="text-[10px]">
                {item.category}
              </Badge>
            )}
            {item.priority <= 2 && !isCompleted && (
              <Badge variant="destructive" className="text-[10px]">
                High priority
              </Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {item.scheduled_start ? (
              <span>{formatTimeRange(item.scheduled_start, item.scheduled_end, timeZone)}</span>
            ) : (
              <span>
                {item.estimated_duration_minutes
                  ? `~${item.estimated_duration_minutes} min`
                  : "Duration: AI will estimate"}
              </span>
            )}
            {item.due_at && <span>Due {formatDueDate(item.due_at)}</span>}
            {item.location && (
              <span className="flex items-center gap-1">
                <MapPinIcon className="size-3" />
                {item.location}
              </span>
            )}
            {item.recurrence_rule && <span>🔁 Repeats</span>}
          </div>
          {item.ai_reasoning && (
            <p className="mt-1.5 text-xs text-muted-foreground italic">
              {item.ai_reasoning}
            </p>
          )}
        </div>

        {!selectable && (
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More actions"
                className="rounded-full p-1.5 text-muted-foreground opacity-100 transition-opacity hover:bg-accent hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
              >
                <MoreHorizontalIcon className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditorOpen(true)}>
                <PencilIcon /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleComplete}>
                {isCompleted ? <UndoIcon /> : <CheckIcon />}
                {isCompleted ? "Mark as not done" : "Mark as done"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDuplicate}>
                <CopyIcon /> Duplicate
              </DropdownMenuItem>
              {item.scheduled_start && (
                <DropdownMenuItem onClick={() => setMoveOpen(true)}>
                  <CalendarDaysIcon /> Move to…
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleArchive}>
                <ArchiveIcon /> Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                <Trash2Icon /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <TaskEditorDialog
        open={isEditorOpen}
        onOpenChange={setEditorOpen}
        item={item}
        allTags={allTags}
        timeZone={timeZone}
      />
      {item.scheduled_start && (
        <MoveToDayDialog open={isMoveOpen} onOpenChange={setMoveOpen} item={item} />
      )}
    </div>
  );
}
