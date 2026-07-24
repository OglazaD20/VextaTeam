"use client";

import * as React from "react";
import { CalendarClockIcon, HistoryIcon, PencilIcon, Trash2Icon, ZapIcon } from "lucide-react";
import { toast } from "sonner";

import { deleteAutomation, toggleAutomation, type AutomationWithLastRun } from "@/app/(app)/automations/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { AutomationEvent, AutomationTrigger } from "@/lib/automations/types";

const EVENT_LABEL: Record<AutomationEvent, string> = {
  task_completed: "a task is completed",
  habit_logged: "a habit is logged",
  mood_logged: "a mood check-in is logged",
  goal_completed: "a goal is completed",
  habit_streak_milestone: "a habit streak hits a milestone",
};

function describeTrigger(trigger: AutomationTrigger): string {
  if (trigger.type === "schedule") {
    const days = trigger.daysOfWeek ?? [];
    const dayLabel =
      days.length === 0 || days.length === 7
        ? "every day"
        : days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))
          ? "on weekdays"
          : `on ${days.map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(", ")}`;
    return `${dayLabel} at ${trigger.time}`;
  }
  return `when ${EVENT_LABEL[trigger.event]}`;
}

export function AutomationCard({
  automation,
  onEdit,
  onShowHistory,
  onChanged,
}: {
  automation: AutomationWithLastRun;
  onEdit: () => void;
  onShowHistory: () => void;
  onChanged: () => void;
}) {
  const [isPending, startTransition] = React.useTransition();
  const trigger = automation.trigger as unknown as AutomationTrigger;
  const actionCount = Array.isArray(automation.actions) ? automation.actions.length : 0;

  function handleToggle(enabled: boolean) {
    startTransition(async () => {
      const result = await toggleAutomation(automation.id, enabled);
      if (result.error) toast.error("Couldn't update automation", { description: result.error });
      onChanged();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAutomation(automation.id);
      if (result.error) {
        toast.error("Couldn't delete automation", { description: result.error });
        return;
      }
      toast.success("Automation deleted");
      onChanged();
    });
  }

  return (
    <div className={`flex flex-col gap-2 rounded-xl border p-4 ${automation.enabled ? "border-border bg-card" : "border-dashed border-border/70 bg-card/50 opacity-70"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{automation.name}</p>
            {automation.source === "ai_generated" && (
              <Badge variant="outline" className="gap-1 text-[10px]">
                <ZapIcon className="size-3" /> AI
              </Badge>
            )}
          </div>
          {automation.description && <p className="mt-0.5 text-xs text-muted-foreground">{automation.description}</p>}
        </div>
        <Switch checked={automation.enabled} onCheckedChange={handleToggle} disabled={isPending} />
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarClockIcon className="size-3.5" />
        IF {describeTrigger(trigger)} &rarr; {actionCount} action{actionCount === 1 ? "" : "s"}
      </p>

      {automation.lastRun && (
        <p className="text-[11px] text-muted-foreground">
          Last run: {new Date(automation.lastRun.ran_at).toLocaleString()} ({automation.lastRun.status})
        </p>
      )}

      <div className="mt-1 flex items-center gap-1">
        <Button size="sm" variant="outline" onClick={onEdit} className="gap-1">
          <PencilIcon className="size-3.5" /> Edit
        </Button>
        <Button size="sm" variant="outline" onClick={onShowHistory} className="gap-1">
          <HistoryIcon className="size-3.5" /> History
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDelete}
          disabled={isPending}
          className="ml-auto gap-1 text-destructive hover:text-destructive"
          aria-label="Delete automation"
        >
          <Trash2Icon className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
