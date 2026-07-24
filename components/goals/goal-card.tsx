"use client";

import * as React from "react";
import { ArchiveIcon, CheckIcon, ChevronDownIcon, MoreHorizontalIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { deleteGoal, setGoalStatus, updateGoal, type GoalWithMilestones } from "@/app/(app)/goals/actions";
import { MilestoneList } from "@/components/goals/milestone-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { GOAL_CATEGORY_COLOR, GOAL_CATEGORY_ICON, GOAL_CATEGORY_LABEL } from "@/lib/goals/category-style";
import { computeGoalProgressPct, predictCompletionDate } from "@/lib/goals/progress";
import { cn } from "@/lib/utils";

const PRIORITY_LABEL: Record<string, string> = { low: "Low", medium: "Medium", high: "High" };

function formatDaysRemaining(deadline: string | null): string | null {
  if (!deadline) return null;
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  return `${days}d left`;
}

export function GoalCard({ goal }: { goal: GoalWithMilestones }) {
  const [isOpen, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [currentValue, setCurrentValue] = React.useState(String(goal.current_value));

  const progressPct = computeGoalProgressPct({
    targetValue: goal.target_value,
    currentValue: goal.current_value,
    manualProgressPct: goal.manual_progress_pct,
    milestones: goal.milestones.map((m) => ({ isCompleted: m.is_completed })),
  });
  const predicted = predictCompletionDate(
    new Date(goal.created_at),
    goal.deadline ? new Date(goal.deadline) : null,
    progressPct,
  );
  const daysRemaining = formatDaysRemaining(goal.deadline);
  const color = GOAL_CATEGORY_COLOR[goal.category];

  function handleStatus(status: "completed" | "archived" | "active") {
    startTransition(async () => {
      const result = await setGoalStatus(goal.id, status);
      if (result.error) toast.error("Couldn't update that goal", { description: result.error });
      else if (status === "completed") toast.success("Goal completed! 🎉");
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteGoal(goal.id);
      if (result.error) toast.error("Couldn't delete that goal", { description: result.error });
    });
  }

  function handleUpdateValue() {
    const formData = new FormData();
    formData.set("title", goal.title);
    formData.set("category", goal.category);
    formData.set("priority", goal.priority);
    formData.set("currentValue", currentValue);
    if (goal.deadline) formData.set("deadline", goal.deadline);
    if (goal.target_value !== null) formData.set("targetValue", String(goal.target_value));
    if (goal.unit) formData.set("unit", goal.unit);

    startTransition(async () => {
      const result = await updateGoal(goal.id, formData);
      if (result.error) toast.error("Couldn't update progress", { description: result.error });
      else toast.success("Progress updated");
    });
  }

  return (
    <div className="glass-surface flex flex-col gap-3 rounded-2xl border border-border p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <span className="text-lg">{goal.icon || GOAL_CATEGORY_ICON[goal.category]}</span>
          <div>
            <p className={cn("font-medium", goal.status === "completed" && "line-through")}>
              {goal.title}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <Badge variant="outline" className="text-[10px]">
                {GOAL_CATEGORY_LABEL[goal.category]}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {PRIORITY_LABEL[goal.priority]} priority
              </Badge>
              {daysRemaining && (
                <Badge variant="outline" className="text-[10px]">
                  {daysRemaining}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="More actions"
              className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <MoreHorizontalIcon className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {goal.status !== "completed" && (
              <DropdownMenuItem disabled={isPending} onClick={() => handleStatus("completed")}>
                <CheckIcon /> Mark complete
              </DropdownMenuItem>
            )}
            {goal.status !== "archived" ? (
              <DropdownMenuItem disabled={isPending} onClick={() => handleStatus("archived")}>
                <ArchiveIcon /> Archive
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled={isPending} onClick={() => handleStatus("active")}>
                <ArchiveIcon /> Restore
              </DropdownMenuItem>
            )}
            <DropdownMenuItem variant="destructive" disabled={isPending} onClick={handleDelete}>
              <Trash2Icon /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-col gap-1">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progressPct}%`, backgroundColor: color }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{progressPct}% complete</span>
          {predicted && (
            <span>
              Predicted:{" "}
              {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(predicted)}
            </span>
          )}
        </div>
      </div>

      {goal.target_value !== null && (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            step="any"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            className="h-8 w-24 text-sm"
          />
          <span className="text-xs text-muted-foreground">
            / {goal.target_value} {goal.unit}
          </span>
          <Button size="sm" variant="outline" className="ml-auto" onClick={handleUpdateValue} disabled={isPending}>
            Update
          </Button>
        </div>
      )}

      <Collapsible open={isOpen} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            {goal.milestones.length > 0
              ? `${goal.milestones.filter((m) => m.is_completed).length}/${goal.milestones.length} milestones`
              : "Add milestones"}
            <ChevronDownIcon className={cn("size-3.5 transition-transform", isOpen && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="pt-2">
            <MilestoneList goalId={goal.id} milestones={goal.milestones} />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
