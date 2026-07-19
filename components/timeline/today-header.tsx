"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, PlusIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useUIStore } from "@/hooks/use-ui-store";

interface PlanResponse {
  scheduled?: number;
  unscheduled?: number;
  error?: string;
}

export function TodayHeader() {
  const openQuickAdd = useUIStore((state) => state.openQuickAdd);
  const router = useRouter();
  const [isPlanning, setIsPlanning] = React.useState(false);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  async function handlePlanDay() {
    setIsPlanning(true);
    try {
      const response = await fetch("/api/ai/plan", { method: "POST" });
      const result: PlanResponse = await response.json();

      if (!response.ok || result.error) {
        toast.error("Couldn't plan your day", { description: result.error });
        return;
      }

      if (!result.scheduled && !result.unscheduled) {
        toast.info("Nothing to schedule", {
          description: "Add a task with \"Let AI find the time\" first.",
        });
        return;
      }

      toast.success(
        result.scheduled
          ? `Scheduled ${result.scheduled} item${result.scheduled === 1 ? "" : "s"}`
          : "Nothing fit today",
        result.unscheduled
          ? { description: `${result.unscheduled} item(s) didn't fit and stayed unscheduled.` }
          : undefined,
      );
      router.refresh();
    } catch {
      toast.error("Couldn't reach the AI planner");
    } finally {
      setIsPlanning(false);
    }
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Today</h1>
        <p className="text-sm text-muted-foreground">{today}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handlePlanDay} disabled={isPlanning}>
          {isPlanning ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
          Plan my day
        </Button>
        <Button onClick={openQuickAdd} size="sm">
          <PlusIcon /> Add
        </Button>
      </div>
    </div>
  );
}
