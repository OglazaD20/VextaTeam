"use client";

import * as React from "react";
import { CheckIcon } from "lucide-react";
import { toast } from "sonner";

import { setScheduleItemStatus } from "@/app/(app)/today/actions";
import { CATEGORY_LABEL, CATEGORY_VAR } from "@/lib/scheduling/category-style";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";

const MIN_BLOCK_HEIGHT = 22;

function formatTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

export function TimelineBlock({
  item,
  top,
  height,
  onOpenEditor,
  onMoveStart,
  onResizeStart,
  isDragging,
}: {
  item: Tables<"schedule_items">;
  top: number;
  height: number;
  onOpenEditor: () => void;
  onMoveStart: (event: React.PointerEvent) => void;
  onResizeStart: (event: React.PointerEvent) => void;
  isDragging: boolean;
}) {
  // Optimistic, matching ScheduleBlock — flips instantly rather than waiting
  // on the server, reverting only if the update actually fails.
  const [isCompleted, setIsCompleted] = React.useState(item.status === "completed");

  // Re-syncs when the server-provided status changes, without an effect
  // (React's recommended pattern for syncing state from props).
  const [syncedStatus, setSyncedStatus] = React.useState(item.status);
  if (item.status !== syncedStatus) {
    setSyncedStatus(item.status);
    setIsCompleted(item.status === "completed");
  }

  const isShort = height < 40;

  function handleToggleComplete(event: React.MouseEvent) {
    event.stopPropagation();
    const next = !isCompleted;
    setIsCompleted(next);

    void setScheduleItemStatus(item.id, next ? "completed" : "planned").then((result) => {
      if (result.error) {
        setIsCompleted(!next);
        toast.error("Couldn't update that", { description: result.error });
        return;
      }
      if (next) {
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

  return (
    <div
      className={cn(
        "group absolute right-1 left-14 flex flex-col overflow-hidden rounded-lg border border-border bg-card px-2 py-1 text-xs shadow-sm select-none",
        isDragging && "opacity-70 shadow-md",
        isCompleted && "opacity-60",
      )}
      style={{
        top,
        height: Math.max(height, MIN_BLOCK_HEIGHT),
        borderLeft: `3px solid ${CATEGORY_VAR[item.type]}`,
        touchAction: "none",
        zIndex: isDragging ? 20 : 10,
      }}
      onPointerDown={onMoveStart}
      onClick={onOpenEditor}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenEditor();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <button
          type="button"
          onClick={handleToggleComplete}
          aria-label={isCompleted ? "Mark as not done" : "Mark as done"}
          className={cn(
            "-m-1 flex size-5 shrink-0 items-center justify-center rounded-full border-2 p-1 transition-all active:scale-90",
            isCompleted ? "border-success bg-success text-white" : "border-border text-transparent hover:border-primary",
          )}
        >
          <CheckIcon className="size-3" strokeWidth={4} />
        </button>
        <span className={cn("truncate font-medium", isCompleted && "line-through")}>
          {item.title}
        </span>
      </div>
      {!isShort && (
        <span className="truncate text-muted-foreground">
          {formatTime(new Date(item.scheduled_start!))} · {CATEGORY_LABEL[item.type]}
        </span>
      )}

      <div
        className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize opacity-0 group-hover:opacity-100"
        onPointerDown={(e) => {
          e.stopPropagation();
          onResizeStart(e);
        }}
      />
    </div>
  );
}
