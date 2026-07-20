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

import { reorderTasks } from "@/app/(app)/today/actions";
import { ScheduleBlock } from "@/components/timeline/schedule-block";
import type { Tables } from "@/types/database";

function SortableItem({
  item,
  allTags,
}: {
  item: Tables<"schedule_items">;
  allTags: string[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
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
        dragHandleProps={{ attributes, listeners: listeners ?? {} }}
      />
    </div>
  );
}

export function UnscheduledList({
  items,
  allTags = [],
}: {
  items: Tables<"schedule_items">[];
  allTags?: string[];
}) {
  const [orderedItems, setOrderedItems] = React.useState(items);
  const [syncedItems, setSyncedItems] = React.useState(items);
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

  if (orderedItems.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        Waiting to be scheduled
      </h2>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={orderedItems.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-3">
            {orderedItems.map((item) => (
              <SortableItem key={item.id} item={item} allTags={allTags} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
