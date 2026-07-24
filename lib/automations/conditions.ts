import type { AutomationCondition, ConditionGroups } from "./types";

/**
 * Real facts gathered right before evaluation — only the slices relevant to
 * the trigger that fired are populated (e.g. a "task_completed" event run
 * populates `task`, a schedule tick populates `weather`/`budgetUsageByCategory`
 * if the automation's conditions need them). A condition whose required
 * context slice is missing simply evaluates false rather than guessing.
 */
export interface AutomationContext {
  dayOfWeek: number;
  timeOfDayMinutes: number;
  task?: { priority: number; category: string | null };
  habit?: { name: string };
  mood?: { mood: number };
  streak?: { count: number };
  weather?: { isRaining: boolean };
  budgetUsageByCategory?: Record<string, number>;
}

export function evaluateCondition(condition: AutomationCondition, ctx: AutomationContext): boolean {
  switch (condition.type) {
    case "task_priority_at_least":
      return ctx.task !== undefined && ctx.task.priority >= Number(condition.value);
    case "task_category_is":
      return ctx.task?.category !== undefined && ctx.task.category === String(condition.value);
    case "habit_name_is":
      return (
        ctx.habit !== undefined && ctx.habit.name.toLowerCase() === String(condition.value).toLowerCase()
      );
    case "mood_at_most":
      return ctx.mood !== undefined && ctx.mood.mood <= Number(condition.value);
    case "streak_at_least":
      return ctx.streak !== undefined && ctx.streak.count >= Number(condition.value);
    case "weather_is_raining":
      return ctx.weather?.isRaining === true;
    case "budget_category_over_pct": {
      if (!ctx.budgetUsageByCategory || typeof condition.value !== "object" || Array.isArray(condition.value)) {
        return false;
      }
      const pct = ctx.budgetUsageByCategory[condition.value.category];
      return pct !== undefined && pct >= condition.value.pct;
    }
    case "day_of_week_is":
      return ctx.dayOfWeek === Number(condition.value);
    case "time_of_day_between": {
      if (!Array.isArray(condition.value) || condition.value.length !== 2) return false;
      const [start, end] = condition.value;
      return ctx.timeOfDayMinutes >= start && ctx.timeOfDayMinutes <= end;
    }
    default:
      return false;
  }
}

/** OR of ANDs — an empty group list means "always run" (no conditions attached). */
export function evaluateConditionGroups(groups: ConditionGroups, ctx: AutomationContext): boolean {
  if (groups.length === 0) return true;
  return groups.some((group) => group.every((condition) => evaluateCondition(condition, ctx)));
}
