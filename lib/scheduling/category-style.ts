import type { ScheduleItemType } from "@/types/database";

export const CATEGORY_LABEL: Record<ScheduleItemType, string> = {
  meeting: "Meeting",
  task: "Task",
  deadline: "Deadline",
  habit: "Habit",
  appointment: "Appointment",
  break: "Break",
  activity: "Activity",
};

export const CATEGORY_VAR: Record<ScheduleItemType, string> = {
  meeting: "var(--category-meeting)",
  task: "var(--category-task)",
  deadline: "var(--category-deadline)",
  habit: "var(--category-habit)",
  appointment: "var(--category-appointment)",
  break: "var(--category-break)",
  activity: "var(--category-activity)",
};
