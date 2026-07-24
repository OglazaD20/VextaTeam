"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon, Loader2Icon, PlusIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { TaskEditorDialog } from "@/components/tasks/task-editor-dialog";

interface PlanResponse {
  scheduled?: number;
  unscheduled?: number;
  daySummary?: string;
  error?: string;
}

export function DayViewHeader({
  dateKey,
  label,
  prevKey,
  nextKey,
  monthKey,
  allTags = [],
  timeZone,
}: {
  dateKey: string;
  label: string;
  prevKey: string;
  nextKey: string;
  monthKey: string;
  allTags?: string[];
  timeZone: string;
}) {
  const router = useRouter();
  const [isEditorOpen, setEditorOpen] = React.useState(false);
  const [isPlanning, setIsPlanning] = React.useState(false);

  async function handlePlanDay() {
    setIsPlanning(true);
    try {
      const response = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateKey }),
      });
      const result: PlanResponse = await response.json();

      if (!response.ok || result.error) {
        toast.error("Couldn't plan this day", { description: result.error });
        return;
      }

      if (!result.scheduled && !result.unscheduled) {
        toast.info("Nothing to schedule", {
          description: "Add a task with \"Let AI find the time\" first.",
        });
        return;
      }

      const description =
        result.daySummary ||
        (result.unscheduled
          ? `${result.unscheduled} item(s) didn't fit and stayed unscheduled.`
          : undefined);

      toast.success(
        result.scheduled
          ? `Scheduled ${result.scheduled} item${result.scheduled === 1 ? "" : "s"}`
          : "Nothing fit that day",
        description ? { description } : undefined,
      );
      router.refresh();
    } catch {
      toast.error("Couldn't reach the AI planner");
    } finally {
      setIsPlanning(false);
    }
  }

  return (
    <div className="sticky top-0 z-20 -mx-4 flex items-center justify-between gap-2 bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:-mx-6 sm:px-6">
      <div className="min-w-0">
        <Link
          href={`/calendar?month=${monthKey}`}
          className="hidden text-xs text-muted-foreground hover:text-foreground sm:inline"
        >
          ← Calendar
        </Link>
        <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">{label}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
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
        <Button variant="outline" size="icon" className="sm:hidden" onClick={handlePlanDay} disabled={isPlanning} aria-label="Plan this day">
          {isPlanning ? <Loader2Icon className="animate-spin" /> : <SparklesIcon className="size-4" />}
        </Button>
        <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={handlePlanDay} disabled={isPlanning}>
          {isPlanning ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
          Plan this day
        </Button>
        <Button onClick={() => setEditorOpen(true)} size="icon" className="sm:hidden" aria-label="Add task">
          <PlusIcon className="size-4" />
        </Button>
        <Button onClick={() => setEditorOpen(true)} size="sm" className="hidden sm:inline-flex">
          <PlusIcon /> Add
        </Button>
      </div>

      <TaskEditorDialog
        open={isEditorOpen}
        onOpenChange={setEditorOpen}
        allTags={allTags}
        defaultDate={dateKey}
        timeZone={timeZone}
      />
    </div>
  );
}
