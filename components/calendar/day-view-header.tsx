"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TaskEditorDialog } from "@/components/tasks/task-editor-dialog";

export function DayViewHeader({
  dateKey,
  label,
  prevKey,
  nextKey,
  monthKey,
  allTags = [],
}: {
  dateKey: string;
  label: string;
  prevKey: string;
  nextKey: string;
  monthKey: string;
  allTags?: string[];
}) {
  const [isEditorOpen, setEditorOpen] = React.useState(false);

  return (
    <div className="flex items-center justify-between">
      <div>
        <Link
          href={`/calendar?month=${monthKey}`}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Calendar
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">{label}</h1>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/calendar/day/${prevKey}`} aria-label="Previous day">
            <ChevronLeftIcon className="size-4" />
          </Link>
        </Button>
        <Button variant="outline" size="icon" asChild>
          <Link href={`/calendar/day/${nextKey}`} aria-label="Next day">
            <ChevronRightIcon className="size-4" />
          </Link>
        </Button>
        <Button onClick={() => setEditorOpen(true)} size="sm">
          <PlusIcon /> Add
        </Button>
      </div>

      <TaskEditorDialog
        open={isEditorOpen}
        onOpenChange={setEditorOpen}
        allTags={allTags}
        defaultDate={dateKey}
      />
    </div>
  );
}
