"use client";

import * as React from "react";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { upsertAutomation } from "@/app/(app)/automations/actions";
import { ActionEditor, defaultActionFor } from "@/components/automations/action-editor";
import { ConditionEditor, defaultValueFor } from "@/components/automations/condition-editor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AutomationAction, AutomationCondition, AutomationEvent, AutomationTrigger } from "@/lib/automations/types";
import { AUTOMATION_EVENTS } from "@/lib/automations/types";

const EVENT_LABEL: Record<AutomationEvent, string> = {
  task_completed: "A task is completed",
  habit_logged: "A habit is logged",
  mood_logged: "A mood check-in is logged",
  goal_completed: "A goal is completed",
  habit_streak_milestone: "A habit streak hits a milestone",
};

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export interface AutomationDraft {
  id?: string;
  name: string;
  description: string;
  trigger: AutomationTrigger;
  conditionGroups: AutomationCondition[][];
  actions: AutomationAction[];
  enabled: boolean;
}

export const EMPTY_DRAFT: AutomationDraft = {
  name: "",
  description: "",
  trigger: { type: "schedule", time: "08:00", daysOfWeek: [] },
  conditionGroups: [],
  actions: [{ type: "send_notification", title: "", body: "" }],
  enabled: true,
};

export function AutomationBuilderDialog({
  open,
  onOpenChange,
  initialDraft,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDraft: AutomationDraft;
  onSaved: () => void;
}) {
  const [draft, setDraft] = React.useState<AutomationDraft>(initialDraft);
  const [isPending, startTransition] = React.useTransition();

  function updateTrigger(next: Partial<AutomationTrigger>) {
    setDraft((d) => ({ ...d, trigger: { ...d.trigger, ...next } as AutomationTrigger }));
  }

  function toggleDay(day: number) {
    if (draft.trigger.type !== "schedule") return;
    const days = draft.trigger.daysOfWeek ?? [];
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort();
    updateTrigger({ daysOfWeek: next });
  }

  function addConditionGroup() {
    setDraft((d) => ({ ...d, conditionGroups: [...d.conditionGroups, [{ type: "day_of_week_is", value: 1 }]] }));
  }

  function addConditionToGroup(groupIndex: number) {
    setDraft((d) => ({
      ...d,
      conditionGroups: d.conditionGroups.map((g, i) =>
        i === groupIndex ? [...g, { type: "day_of_week_is", value: defaultValueFor("day_of_week_is") }] : g,
      ),
    }));
  }

  function updateCondition(groupIndex: number, conditionIndex: number, next: AutomationCondition) {
    setDraft((d) => ({
      ...d,
      conditionGroups: d.conditionGroups.map((g, i) =>
        i === groupIndex ? g.map((c, ci) => (ci === conditionIndex ? next : c)) : g,
      ),
    }));
  }

  function removeCondition(groupIndex: number, conditionIndex: number) {
    setDraft((d) => ({
      ...d,
      conditionGroups: d.conditionGroups
        .map((g, i) => (i === groupIndex ? g.filter((_, ci) => ci !== conditionIndex) : g))
        .filter((g) => g.length > 0),
    }));
  }

  function addAction() {
    setDraft((d) => ({ ...d, actions: [...d.actions, defaultActionFor("send_notification")] }));
  }

  function updateAction(index: number, next: AutomationAction) {
    setDraft((d) => ({ ...d, actions: d.actions.map((a, i) => (i === index ? next : a)) }));
  }

  function removeAction(index: number) {
    setDraft((d) => ({ ...d, actions: d.actions.filter((_, i) => i !== index) }));
  }

  function handleSave() {
    if (!draft.name.trim()) {
      toast.error("Give the automation a name");
      return;
    }
    if (draft.actions.length === 0) {
      toast.error("Add at least one action");
      return;
    }

    startTransition(async () => {
      const result = await upsertAutomation({
        id: draft.id,
        name: draft.name,
        description: draft.description || null,
        enabled: draft.enabled,
        trigger: draft.trigger,
        conditionGroups: draft.conditionGroups,
        actions: draft.actions,
      });
      if (result.error) {
        toast.error("Couldn't save automation", { description: result.error });
        return;
      }
      toast.success(draft.id ? "Automation updated" : "Automation created");
      onOpenChange(false);
      onSaved();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{draft.id ? "Edit automation" : "New automation"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="automation-name">Name</Label>
            <Input
              id="automation-name"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="e.g. Weekend workout reminder"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="automation-description">Description (optional)</Label>
            <Textarea
              id="automation-description"
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              className="min-h-16"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>IF — trigger</Label>
            <Select
              value={draft.trigger.type}
              onValueChange={(type) =>
                setDraft((d) => ({
                  ...d,
                  trigger:
                    type === "schedule"
                      ? { type: "schedule", time: "08:00", daysOfWeek: [] }
                      : { type: "event", event: "task_completed" },
                }))
              }
            >
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="schedule">On a schedule</SelectItem>
                <SelectItem value="event">When something happens</SelectItem>
              </SelectContent>
            </Select>

            {draft.trigger.type === "schedule" ? (
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  type="time"
                  className="w-32"
                  value={draft.trigger.time}
                  onChange={(e) => updateTrigger({ time: e.target.value })}
                />
                <div className="flex gap-1">
                  {DAY_LABELS.map((label, day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`flex size-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                        draft.trigger.type === "schedule" && (draft.trigger.daysOfWeek ?? []).includes(day)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">(none selected = every day)</span>
              </div>
            ) : (
              <Select
                value={draft.trigger.type === "event" ? draft.trigger.event : "task_completed"}
                onValueChange={(event) => updateTrigger({ event: event as AutomationEvent })}
              >
                <SelectTrigger className="w-72">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUTOMATION_EVENTS.map((event) => (
                    <SelectItem key={event} value={event}>
                      {EVENT_LABEL[event]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>AND / OR conditions (optional — leave empty to always run)</Label>
              <Button type="button" size="sm" variant="outline" onClick={addConditionGroup} className="gap-1">
                <PlusIcon className="size-3.5" /> Add OR group
              </Button>
            </div>
            {draft.conditionGroups.map((group, groupIndex) => (
              <React.Fragment key={groupIndex}>
                {groupIndex > 0 && <p className="text-center text-xs font-medium text-muted-foreground">OR</p>}
                <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-2">
                  {group.map((condition, conditionIndex) => (
                    <ConditionEditor
                      key={conditionIndex}
                      condition={condition}
                      onChange={(next) => updateCondition(groupIndex, conditionIndex, next)}
                      onRemove={() => removeCondition(groupIndex, conditionIndex)}
                    />
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="self-start gap-1 text-xs"
                    onClick={() => addConditionToGroup(groupIndex)}
                  >
                    <PlusIcon className="size-3.5" /> Add AND condition
                  </Button>
                </div>
              </React.Fragment>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>THEN — actions</Label>
              <Button type="button" size="sm" variant="outline" onClick={addAction} className="gap-1">
                <PlusIcon className="size-3.5" /> Add action
              </Button>
            </div>
            {draft.actions.map((action, index) => (
              <ActionEditor
                key={index}
                action={action}
                onChange={(next) => updateAction(index, next)}
                onRemove={() => removeAction(index)}
              />
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            Save automation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
