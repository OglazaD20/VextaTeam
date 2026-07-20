"use client";

import { AnimatePresence, motion } from "framer-motion";
import { LayoutDashboardIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ScheduleBlock } from "@/components/timeline/schedule-block";
import { useUIStore } from "@/hooks/use-ui-store";
import type { Tables } from "@/types/database";

export function DayTimeline({
  items,
  allTags = [],
}: {
  items: Tables<"schedule_items">[];
  allTags?: string[];
}) {
  const openQuickAdd = useUIStore((state) => state.openQuickAdd);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={LayoutDashboardIcon}
        title="Nothing on your plate today"
        description="Add a meeting, task, or appointment and it'll show up here."
      >
        <Button onClick={openQuickAdd} className="mt-2">
          <PlusIcon /> Add something
        </Button>
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ScheduleBlock item={item} allTags={allTags} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
