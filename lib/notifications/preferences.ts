import type { NotificationType } from "@/types/database";

/**
 * Every user-toggleable notification category. "reschedule" is deliberately
 * excluded — it's a direct consequence of an action the user just took (the
 * AI moved something), not an ambient reminder to opt out of.
 *
 * Discover suggestions and AI Coach recommendations aren't listed: doing
 * either well as a background push would mean running the AI
 * discovery/coaching pipeline for every user on a schedule, a real ongoing
 * OpenAI cost this pass doesn't take on — better to leave them out than
 * ship a toggle for something that never actually fires.
 */
export const NOTIFICATION_CATEGORIES: { type: NotificationType; label: string; description: string }[] = [
  { type: "free_time", label: "Free time", description: "When you have a solid block of free time today." },
  { type: "break_reminder", label: "Break reminders", description: "During long, uninterrupted blocks of work." },
  { type: "habit_skip", label: "Habit reminders", description: "Habits you haven't logged yet today." },
  { type: "task_reminder", label: "Upcoming tasks", description: "A task or meeting starting soon." },
  { type: "water_reminder", label: "Drink water", description: "When you're behind on today's water goal." },
  { type: "meal_reminder", label: "Meal reminders", description: "Around mealtimes if nothing's logged yet." },
  { type: "bedtime_reminder", label: "Bedtime", description: "As your usual bedtime approaches." },
  { type: "goal_reminder", label: "Goal deadlines", description: "Goals with a deadline coming up and little progress." },
  { type: "finance_reminder", label: "Bills & subscriptions", description: "Subscriptions or bills due soon." },
  { type: "calendar_reminder", label: "Calendar", description: "A fixed calendar event starting soon." },
  { type: "weather", label: "Weather alerts", description: "Notable weather that could affect your plans." },
  { type: "weekly_report", label: "Weekly report", description: "Your weekly summary is ready." },
];

export type NotificationPrefs = Record<string, boolean>;

export function isNotificationEnabled(prefs: NotificationPrefs | null | undefined, type: NotificationType): boolean {
  return prefs?.[type] !== false;
}
