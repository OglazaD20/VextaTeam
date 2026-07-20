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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TaskEditorDialog } from "@/components/tasks/task-editor-dialog";
import { MoveToDayDialog } from "@/components/tasks/move-to-day-dialog";
import { CATEGORY_LABEL, CATEGORY_VAR } from "@/lib/scheduling/category-style";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";

function formatTimeRange(start: string | null, end: string | null) {
  if (!start) return null;
  const formatter = new Intl.DateTimeFormat(undefined, {
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
}: {
  item: Tables<"schedule_items">;
  allTags?: string[];
  dragHandleProps?: {
    attributes: React.HTMLAttributes<HTMLButtonElement>;
    listeners: Record<string, unknown>;
  };
}) {
  const [isPending, startTransition] = useTransition();
  const [isEditorOpen, setEditorOpen] = React.useState(false);
  const [isMoveOpen, setMoveOpen] = React.useState(false);
  const isCompleted = item.status === "completed";

  function handleToggleComplete() {
    startTransition(async () => {
      const result = await setScheduleItemStatus(
        item.id,
        isCompleted ? "planned" : "completed",
      );
      if (result.error) {
        toast.error("Couldn't update that", { description: result.error });
      }
    });
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

  return (
    <div
      className={cn(
        "group flex items-start gap-2 rounded-2xl border border-border bg-card p-4 pl-4 shadow-sm transition-opacity",
        isPending && "opacity-60",
      )}
      style={{ borderLeft: `3px solid ${CATEGORY_VAR[item.type]}` }}
    >
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

      <button
        type="button"
        onClick={handleToggleComplete}
        disabled={isPending}
        aria-label={isCompleted ? "Mark as not done" : "Mark as done"}
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          isCompleted
            ? "border-success bg-success text-white"
            : "border-border text-transparent hover:border-primary",
        )}
      >
        <CheckIcon className="size-3.5" strokeWidth={3} />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={cn(
              "text-sm font-medium",
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
            <span>{formatTimeRange(item.scheduled_start, item.scheduled_end)}</span>
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

      <TaskEditorDialog
        open={isEditorOpen}
        onOpenChange={setEditorOpen}
        item={item}
        allTags={allTags}
      />
      {item.scheduled_start && (
        <MoveToDayDialog open={isMoveOpen} onOpenChange={setMoveOpen} item={item} />
      )}
    </div>
  );
}
