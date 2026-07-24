/**
 * Fixed vocabulary for the automation builder — every trigger/condition/
 * action kind maps to a real, already-existing piece of app behavior
 * (a real table, a real notification, a real mutation). Nothing here can
 * express an invented capability; the AI parser (parse-automation.ts) is
 * constrained to this same enum, so it can only ever produce automations
 * the engine can actually execute.
 */

export type TriggerKind = "schedule" | "event";

export interface ScheduleTrigger {
  type: "schedule";
  /** "HH:MM" in the user's own timezone. */
  time: string;
  /** 0 (Sunday) - 6 (Saturday); omitted/empty means every day. */
  daysOfWeek?: number[];
}

export type AutomationEvent =
  | "task_completed"
  | "habit_logged"
  | "mood_logged"
  | "goal_completed"
  | "habit_streak_milestone";

export interface EventTrigger {
  type: "event";
  event: AutomationEvent;
}

export type AutomationTrigger = ScheduleTrigger | EventTrigger;

export type ConditionType =
  | "task_priority_at_least"
  | "task_category_is"
  | "habit_name_is"
  | "mood_at_most"
  | "streak_at_least"
  | "weather_is_raining"
  | "budget_category_over_pct"
  | "day_of_week_is"
  | "time_of_day_between";

export interface AutomationCondition {
  type: ConditionType;
  /** Meaning depends on `type` — a priority number, a category/habit-name string, a day-of-week number, an [startMinutes, endMinutes] pair, or {category, pct} for budget_category_over_pct. */
  value: string | number | number[] | { category: string; pct: number };
}

/** Outer array = OR, each inner array = a group of conditions ANDed together. */
export type ConditionGroups = AutomationCondition[][];

export type ActionType =
  | "create_task"
  | "send_notification"
  | "reschedule_matching_items"
  | "award_bonus_xp"
  | "log_note";

export interface CreateTaskAction {
  type: "create_task";
  title: string;
  /** Minutes from now the task should be scheduled at; omitted means unscheduled (added to the backlog). */
  inMinutes?: number;
  estimatedDurationMinutes?: number;
}

export interface SendNotificationAction {
  type: "send_notification";
  title: string;
  body: string;
}

export interface RescheduleMatchingItemsAction {
  type: "reschedule_matching_items";
  /** Only reschedule today's items of this schedule_items category, if given. */
  category?: string;
  shiftMinutes: number;
}

export interface AwardBonusXpAction {
  type: "award_bonus_xp";
  xp: number;
}

export interface LogNoteAction {
  type: "log_note";
  note: string;
}

export type AutomationAction =
  | CreateTaskAction
  | SendNotificationAction
  | RescheduleMatchingItemsAction
  | AwardBonusXpAction
  | LogNoteAction;

export interface AutomationDefinition {
  name: string;
  description: string | null;
  trigger: AutomationTrigger;
  conditionGroups: ConditionGroups;
  actions: AutomationAction[];
}

export const CONDITION_TYPES: ConditionType[] = [
  "task_priority_at_least",
  "task_category_is",
  "habit_name_is",
  "mood_at_most",
  "streak_at_least",
  "weather_is_raining",
  "budget_category_over_pct",
  "day_of_week_is",
  "time_of_day_between",
];

export const ACTION_TYPES: ActionType[] = [
  "create_task",
  "send_notification",
  "reschedule_matching_items",
  "award_bonus_xp",
  "log_note",
];

export const AUTOMATION_EVENTS: AutomationEvent[] = [
  "task_completed",
  "habit_logged",
  "mood_logged",
  "goal_completed",
  "habit_streak_milestone",
];
