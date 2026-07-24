"use client";

import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CONDITION_TYPES, type AutomationCondition, type ConditionType } from "@/lib/automations/types";

const CONDITION_LABEL: Record<ConditionType, string> = {
  task_priority_at_least: "Task priority is at least",
  task_category_is: "Task category is",
  habit_name_is: "Habit name is",
  mood_at_most: "Mood is at most",
  streak_at_least: "Streak is at least",
  weather_is_raining: "It's currently raining",
  budget_category_over_pct: "Budget category is over %",
  day_of_week_is: "Day of week is",
  time_of_day_between: "Time of day is between",
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function defaultValueFor(type: ConditionType): AutomationCondition["value"] {
  switch (type) {
    case "task_priority_at_least":
    case "mood_at_most":
    case "streak_at_least":
      return 1;
    case "day_of_week_is":
      return 1;
    case "task_category_is":
    case "habit_name_is":
      return "";
    case "weather_is_raining":
      return 1;
    case "budget_category_over_pct":
      return { category: "", pct: 80 };
    case "time_of_day_between":
      return [9 * 60, 17 * 60];
  }
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function ConditionEditor({
  condition,
  onChange,
  onRemove,
}: {
  condition: AutomationCondition;
  onChange: (next: AutomationCondition) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-2">
      <Select
        value={condition.type}
        onValueChange={(type) => onChange({ type: type as ConditionType, value: defaultValueFor(type as ConditionType) })}
      >
        <SelectTrigger className="h-8 w-56 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CONDITION_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {CONDITION_LABEL[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {(condition.type === "task_priority_at_least" ||
        condition.type === "mood_at_most" ||
        condition.type === "streak_at_least") && (
        <Input
          type="number"
          className="h-8 w-20 text-xs"
          value={Number(condition.value)}
          onChange={(e) => onChange({ ...condition, value: Number(e.target.value) })}
        />
      )}

      {(condition.type === "task_category_is" || condition.type === "habit_name_is") && (
        <Input
          className="h-8 w-40 text-xs"
          value={String(condition.value)}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
        />
      )}

      {condition.type === "day_of_week_is" && (
        <Select value={String(condition.value)} onValueChange={(v) => onChange({ ...condition, value: Number(v) })}>
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DAY_NAMES.map((name, index) => (
              <SelectItem key={name} value={String(index)}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {condition.type === "budget_category_over_pct" && !Array.isArray(condition.value) && typeof condition.value === "object" && (
        <>
          <Input
            className="h-8 w-32 text-xs"
            placeholder="Category"
            value={condition.value.category}
            onChange={(e) => onChange({ ...condition, value: { ...condition.value as { category: string; pct: number }, category: e.target.value } })}
          />
          <Input
            type="number"
            className="h-8 w-20 text-xs"
            value={(condition.value as { category: string; pct: number }).pct}
            onChange={(e) => onChange({ ...condition, value: { ...(condition.value as { category: string; pct: number }), pct: Number(e.target.value) } })}
          />
          <span className="text-xs text-muted-foreground">%</span>
        </>
      )}

      {condition.type === "time_of_day_between" && Array.isArray(condition.value) && (
        <>
          <Input
            type="time"
            className="h-8 w-28 text-xs"
            value={minutesToTime(condition.value[0])}
            onChange={(e) => onChange({ ...condition, value: [timeToMinutes(e.target.value), (condition.value as number[])[1]] })}
          />
          <span className="text-xs text-muted-foreground">and</span>
          <Input
            type="time"
            className="h-8 w-28 text-xs"
            value={minutesToTime(condition.value[1])}
            onChange={(e) => onChange({ ...condition, value: [(condition.value as number[])[0], timeToMinutes(e.target.value)] })}
          />
        </>
      )}

      <Button type="button" size="icon" variant="ghost" className="ml-auto size-7" onClick={onRemove} aria-label="Remove condition">
        <XIcon className="size-3.5" />
      </Button>
    </div>
  );
}

export { defaultValueFor };
