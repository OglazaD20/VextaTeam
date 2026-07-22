"use client";

import * as React from "react";

import { moveTaskToDay } from "@/app/(app)/today/actions";
import { TaskEditorDialog } from "@/components/tasks/task-editor-dialog";
import { TimelineBlock } from "@/components/calendar/timeline-block";
import { getTodayKey } from "@/lib/habits/today-key";
import {
  clampMinutes,
  minutesFromMidnight,
  minutesToPx,
  pxToMinutes,
  snapMinutes,
} from "@/lib/scheduling/timeline-layout";
import type { Tables } from "@/types/database";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const GRID_HEIGHT = 24 * 60; // 1px per minute

function formatHourLabel(hour: number) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(
    new Date(2000, 0, 1, hour),
  );
}

/** Static gridlines — memoized so dragging a block (which re-renders TimelineGrid on every pointermove) doesn't reconcile these 24 nodes every frame. */
const HourGridLines = React.memo(function HourGridLines() {
  return (
    <>
      {HOURS.map((hour) => (
        <div
          key={hour}
          className="absolute inset-x-0 border-t border-border/60"
          style={{ top: minutesToPx(hour * 60) }}
        >
          <span className="absolute -top-2.5 left-0 w-12 bg-background pr-2 text-right text-[10px] text-muted-foreground">
            {formatHourLabel(hour)}
          </span>
        </div>
      ))}
    </>
  );
});

interface DragState {
  itemId: string;
  mode: "move" | "resize";
  startClientY: number;
  originalStartMinutes: number;
  originalDurationMinutes: number;
  previewStartMinutes: number;
  previewDurationMinutes: number;
}

export function TimelineGrid({
  items,
  dateKey,
  timeZone,
  allTags = [],
}: {
  items: Tables<"schedule_items">[];
  dateKey: string;
  timeZone: string;
  allTags?: string[];
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const didDragRef = React.useRef(false);
  const [drag, setDrag] = React.useState<DragState | null>(null);
  const [editingItem, setEditingItem] = React.useState<Tables<"schedule_items"> | null>(null);
  const [isEditorOpen, setEditorOpen] = React.useState(false);
  const [createAt, setCreateAt] = React.useState<string | null>(null);

  // Scrolls the (otherwise 1440px-tall, hour-0-to-24 tall) timeline so "now"
  // starts near the top of the viewport instead of forcing a long scroll
  // past every early-morning hour on every visit — a real mobile pain point,
  // not just a nice-to-have.
  React.useEffect(() => {
    if (dateKey !== getTodayKey(timeZone)) return;
    const nowMinutes = minutesFromMidnight(new Date(), timeZone);
    const target = Math.max(0, minutesToPx(nowMinutes) - 120);
    scrollRef.current?.scrollTo({ top: target });
    // Only ever run once per mount — a user manually scrolling shouldn't get
    // yanked back to "now".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scheduled = React.useMemo(
    () => items.filter((item) => item.scheduled_start && item.scheduled_end),
    [items],
  );

  function minutesFromEvent(clientY: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return clampMinutes(pxToMinutes(clientY - rect.top));
  }

  function handleMoveStart(item: Tables<"schedule_items">, event: React.PointerEvent) {
    if ((event.target as HTMLElement).closest("button")) return;
    didDragRef.current = false;
    const startMinutes = minutesFromMidnight(new Date(item.scheduled_start!), timeZone);
    const endMinutes = minutesFromMidnight(new Date(item.scheduled_end!), timeZone);
    setDrag({
      itemId: item.id,
      mode: "move",
      startClientY: event.clientY,
      originalStartMinutes: startMinutes,
      originalDurationMinutes: Math.max(15, endMinutes - startMinutes),
      previewStartMinutes: startMinutes,
      previewDurationMinutes: Math.max(15, endMinutes - startMinutes),
    });
  }

  function handleResizeStart(item: Tables<"schedule_items">, event: React.PointerEvent) {
    didDragRef.current = false;
    const startMinutes = minutesFromMidnight(new Date(item.scheduled_start!), timeZone);
    const endMinutes = minutesFromMidnight(new Date(item.scheduled_end!), timeZone);
    setDrag({
      itemId: item.id,
      mode: "resize",
      startClientY: event.clientY,
      originalStartMinutes: startMinutes,
      originalDurationMinutes: Math.max(15, endMinutes - startMinutes),
      previewStartMinutes: startMinutes,
      previewDurationMinutes: Math.max(15, endMinutes - startMinutes),
    });
  }

  React.useEffect(() => {
    if (!drag) return;

    function handlePointerMove(event: PointerEvent) {
      setDrag((current) => {
        if (!current) return current;
        const deltaMinutes = snapMinutes(pxToMinutes(event.clientY - current.startClientY));
        if (deltaMinutes !== 0) didDragRef.current = true;

        if (current.mode === "move") {
          const previewStart = clampMinutes(current.originalStartMinutes + deltaMinutes, 0, 1440 - current.originalDurationMinutes);
          return { ...current, previewStartMinutes: previewStart };
        }

        const previewDuration = Math.max(
          15,
          clampMinutes(current.originalDurationMinutes + deltaMinutes, 15, 1440 - current.originalStartMinutes),
        );
        return { ...current, previewDurationMinutes: previewDuration };
      });
    }

    function handlePointerUp() {
      setDrag((current) => {
        if (!current) return null;

        const unchanged =
          current.previewStartMinutes === current.originalStartMinutes &&
          current.previewDurationMinutes === current.originalDurationMinutes;

        const item = items.find((i) => i.id === current.itemId);
        if (item && !unchanged) {
          const [year, month, day] = dateKey.split("-").map(Number);
          const dayStart = new Date(year, month - 1, day);
          const newStart = new Date(dayStart.getTime() + current.previewStartMinutes * 60_000);
          const newEnd = new Date(
            dayStart.getTime() + (current.previewStartMinutes + current.previewDurationMinutes) * 60_000,
          );
          void moveTaskToDay(item.id, newStart.toISOString(), newEnd.toISOString());
        }

        return null;
      });
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [drag, items, dateKey]);

  function handleGridClick(event: React.MouseEvent) {
    if (event.target !== event.currentTarget) return;
    const minutes = snapMinutes(minutesFromEvent(event.clientY));
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    const pad = (n: number) => String(n).padStart(2, "0");
    setEditingItem(null);
    setCreateAt(`${dateKey}T${pad(hours)}:${pad(mins)}:00`);
    setEditorOpen(true);
  }

  const isToday = dateKey === getTodayKey(timeZone);

  return (
    <div className="flex flex-col gap-3">
      <div ref={scrollRef} className="max-h-[min(70vh,820px)] overflow-y-auto overscroll-contain rounded-xl">
        <div
          ref={containerRef}
          className="relative border-t border-border"
          style={{ height: GRID_HEIGHT }}
          onClick={handleGridClick}
        >
          <HourGridLines />
          {isToday && <NowIndicator timeZone={timeZone} />}

          {scheduled.map((item) => {
          const isDraggingThis = drag?.itemId === item.id;
          const startMinutes = isDraggingThis
            ? drag.previewStartMinutes
            : minutesFromMidnight(new Date(item.scheduled_start!), timeZone);
          const durationMinutes = isDraggingThis
            ? drag.previewDurationMinutes
            : Math.max(
                15,
                minutesFromMidnight(new Date(item.scheduled_end!), timeZone) - startMinutes,
              );

          return (
            <TimelineBlock
              key={item.id}
              item={item}
              top={minutesToPx(startMinutes)}
              height={minutesToPx(durationMinutes)}
              isDragging={isDraggingThis}
              onMoveStart={(e) => handleMoveStart(item, e)}
              onResizeStart={(e) => handleResizeStart(item, e)}
              onOpenEditor={() => {
                if (drag || didDragRef.current) return;
                setEditingItem(item);
                setCreateAt(null);
                setEditorOpen(true);
              }}
            />
          );
          })}
        </div>
      </div>

      <TaskEditorDialog
        open={isEditorOpen}
        onOpenChange={setEditorOpen}
        item={editingItem}
        allTags={allTags}
        defaultDate={createAt ?? dateKey}
      />
    </div>
  );
}

/** A live "now" marker on today's timeline, refreshing once a minute. */
function NowIndicator({ timeZone }: { timeZone: string }) {
  const [minutes, setMinutes] = React.useState(() => minutesFromMidnight(new Date(), timeZone));

  React.useEffect(() => {
    const interval = setInterval(() => setMinutes(minutesFromMidnight(new Date(), timeZone)), 60_000);
    return () => clearInterval(interval);
  }, [timeZone]);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-30 flex items-center gap-1"
      style={{ top: minutesToPx(minutes) }}
    >
      <span className="ml-11 size-2 shrink-0 rounded-full bg-destructive" />
      <div className="h-px flex-1 bg-destructive" />
    </div>
  );
}
