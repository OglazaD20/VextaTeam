"use client";

import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ACTION_TYPES, type ActionType, type AutomationAction } from "@/lib/automations/types";

const ACTION_LABEL: Record<ActionType, string> = {
  create_task: "Create a task",
  send_notification: "Send a notification",
  reschedule_matching_items: "Reschedule today's matching items",
  award_bonus_xp: "Award bonus XP",
  log_note: "Save a note to AI Memory",
};

function defaultActionFor(type: ActionType): AutomationAction {
  switch (type) {
    case "create_task":
      return { type, title: "" };
    case "send_notification":
      return { type, title: "", body: "" };
    case "reschedule_matching_items":
      return { type, shiftMinutes: 30 };
    case "award_bonus_xp":
      return { type, xp: 10 };
    case "log_note":
      return { type, note: "" };
  }
}

export function ActionEditor({
  action,
  onChange,
  onRemove,
}: {
  action: AutomationAction;
  onChange: (next: AutomationAction) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-2">
      <div className="flex items-center gap-2">
        <Select value={action.type} onValueChange={(type) => onChange(defaultActionFor(type as ActionType))}>
          <SelectTrigger className="h-8 w-64 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTION_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {ACTION_LABEL[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" size="icon" variant="ghost" className="ml-auto size-7" onClick={onRemove}>
          <XIcon className="size-3.5" />
        </Button>
      </div>

      {action.type === "create_task" && (
        <div className="flex flex-wrap gap-2">
          <Input
            className="h-8 flex-1 text-xs"
            placeholder="Task title"
            value={action.title}
            onChange={(e) => onChange({ ...action, title: e.target.value })}
          />
          <Input
            type="number"
            className="h-8 w-32 text-xs"
            placeholder="In N minutes"
            value={action.inMinutes ?? ""}
            onChange={(e) => onChange({ ...action, inMinutes: e.target.value ? Number(e.target.value) : undefined })}
          />
        </div>
      )}

      {action.type === "send_notification" && (
        <div className="flex flex-col gap-2">
          <Input
            className="h-8 text-xs"
            placeholder="Title"
            value={action.title}
            onChange={(e) => onChange({ ...action, title: e.target.value })}
          />
          <Textarea
            className="min-h-16 text-xs"
            placeholder="Message"
            value={action.body}
            onChange={(e) => onChange({ ...action, body: e.target.value })}
          />
        </div>
      )}

      {action.type === "reschedule_matching_items" && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="h-8 w-40 text-xs"
            placeholder="Category (optional)"
            value={action.category ?? ""}
            onChange={(e) => onChange({ ...action, category: e.target.value || undefined })}
          />
          <span className="text-xs text-muted-foreground">shift by</span>
          <Input
            type="number"
            className="h-8 w-24 text-xs"
            value={action.shiftMinutes}
            onChange={(e) => onChange({ ...action, shiftMinutes: Number(e.target.value) })}
          />
          <span className="text-xs text-muted-foreground">minutes (negative = earlier)</span>
        </div>
      )}

      {action.type === "award_bonus_xp" && (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            className="h-8 w-24 text-xs"
            value={action.xp}
            onChange={(e) => onChange({ ...action, xp: Number(e.target.value) })}
          />
          <span className="text-xs text-muted-foreground">XP</span>
        </div>
      )}

      {action.type === "log_note" && (
        <Textarea
          className="min-h-16 text-xs"
          placeholder="Note"
          value={action.note}
          onChange={(e) => onChange({ ...action, note: e.target.value })}
        />
      )}
    </div>
  );
}

export { defaultActionFor };
