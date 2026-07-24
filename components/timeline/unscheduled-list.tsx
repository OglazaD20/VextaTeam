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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckIcon, ListChecksIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { bulkSetScheduleItemStatus, reorderTasks } from "@/app/(app)/today/actions";
import { ScheduleBlock } from "@/components/timeline/schedule-block";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/types/database";

function SortableItem({
  item,
  allTags,
  selectable,
  selected,
  onToggleSelected,
  timeZone,
}: {
  item: Tables<"schedule_items">;
  allTags: string[];
  selectable: boolean;
  selected: boolean;
  onToggleSelected: () => void;
  timeZone: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: selectable,
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
      <ScheduleBlock
        item={item}
        allTags={allTags}
        dragHandleProps={selectable ? undefined : { attributes, listeners: listeners ?? {} }}
        selectable={selectable}
        selected={selected}
        onToggleSelected={onToggleSelected}
        timeZone={timeZone}
      />
    </div>
  );
}

export function UnscheduledList({
  items,
  allTags = [],
  timeZone,
}: {
  items: Tables<"schedule_items">[];
  allTags?: string[];
  timeZone: string;
}) {
  const [orderedItems, setOrderedItems] = React.useState(items);
  const [syncedItems, setSyncedItems] = React.useState(items);
  const [isSelecting, setIsSelecting] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isPending, startTransition] = React.useTransition();

  // Adjust local drag state when the server-provided list changes, without an
  // effect (React's recommended pattern for syncing state from props).
  if (items !== syncedItems) {
    setSyncedItems(items);
    setOrderedItems(items);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedItems.findIndex((i) => i.id === active.id);
    const newIndex = orderedItems.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = [...orderedItems];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    setOrderedItems(next);
    void reorderTasks(next.map((i) => i.id));
  }

  function toggleSelectMode() {
    setIsSelecting((v) => !v);
    setSelectedIds(new Set());
  }

  function toggleItemSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBulkComplete() {
    const ids = [...selectedIds];
    startTransition(async () => {
      const result = await bulkSetScheduleItemStatus(ids, "completed");
      if (result.error) {
        toast.error("Couldn't complete those", { description: result.error });
        return;
      }
      toast.success(`${ids.length} task${ids.length === 1 ? "" : "s"} completed`);
      setIsSelecting(false);
      setSelectedIds(new Set());
    });
  }

  if (orderedItems.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          Waiting to be scheduled
        </h2>
        <Button variant="ghost" size="sm" onClick={toggleSelectMode}>
          {isSelecting ? (
            <>
              <XIcon className="size-3.5" /> Cancel
            </>
          ) : (
            <>
              <ListChecksIcon className="size-3.5" /> Select
            </>
          )}
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={orderedItems.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-3 pb-16">
            {orderedItems.map((item) => (
              <SortableItem
                key={item.id}
                item={item}
                allTags={allTags}
                selectable={isSelecting}
                selected={selectedIds.has(item.id)}
                onToggleSelected={() => toggleItemSelected(item.id)}
                timeZone={timeZone}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {isSelecting && selectedIds.size > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-20 flex justify-center px-4">
          <div className="glass-surface flex items-center gap-3 rounded-full border border-border px-4 py-2 shadow-lg">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <Button size="sm" onClick={handleBulkComplete} disabled={isPending}>
              <CheckIcon className="size-3.5" /> Mark done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
