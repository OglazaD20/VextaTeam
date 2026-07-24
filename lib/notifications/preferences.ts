import type { NotificationType } from "@/types/database";

/**
 * Every user-toggleable notification category. "reschedule" is deliberately
 * excluded — it's a direct consequence of an action the user just took (the
 * AI moved something), not an ambient reminder to opt out of.
 *
 * "coach_suggestion" and "discover_recommendation" only fire at the moment
 * those AI pipelines already ran for another reason (the user opened AI
 * Coach, or generated Discover suggestions) — never on a new speculative
 * background schedule, so there's no extra ongoing OpenAI cost from listing
 * them here.
 */
export const NOTIFICATION_CATEGORIES: { type: NotificationType; label: string; description: string }[] = [
  { type: "morning_summary", label: "Morning summary", description: "A quick look at today's schedule when you start your day." },
  { type: "free_time", label: "Free time", description: "When you have a solid block of free time today." },
  { type: "break_reminder", label: "Break reminders", description: "During long, uninterrupted blocks of work." },
  { type: "habit_skip", label: "Habit reminders", description: "Habits you haven't logged yet today." },
  { type: "task_reminder", label: "Upcoming tasks", description: "A task or meeting starting soon." },
  { type: "water_reminder", label: "Drink water", description: "When you're behind on today's water goal." },
  { type: "meal_reminder", label: "Meal reminders", description: "Around mealtimes if nothing's logged yet." },
  { type: "workout_reminder", label: "Workout reminders", description: "If you haven't logged a workout by evening." },
  { type: "bedtime_reminder", label: "Bedtime", description: "As your usual bedtime approaches." },
  { type: "goal_reminder", label: "Goal deadlines", description: "Goals with a deadline coming up and little progress." },
  { type: "finance_reminder", label: "Bills & subscriptions", description: "Subscriptions or bills due soon." },
  { type: "calendar_reminder", label: "Calendar", description: "A fixed calendar event starting soon." },
  { type: "coach_suggestion", label: "AI Coach suggestions", description: "When a fresh AI Coach insight is ready." },
  { type: "discover_recommendation", label: "Discover recommendations", description: "When new Discover suggestions are ready." },
  { type: "weather", label: "Weather alerts", description: "Notable weather that could affect your plans." },
  { type: "weekly_report", label: "Weekly report", description: "Your weekly summary is ready." },
];

/** Ambient, non-deadline-driven nudges — silenced first when reminder frequency is turned down. */
const AMBIENT_TYPES: ReadonlySet<NotificationType> = new Set([
  "free_time",
  "break_reminder",
  "weather",
  "morning_summary",
]);

export function isNotificationDueForFrequency(
  type: NotificationType,
  frequency: "normal" | "reduced" | "minimal" | null | undefined,
): boolean {
  if (frequency === "minimal") return !AMBIENT_TYPES.has(type);
  return true;
}

export type NotificationPrefs = Record<string, boolean>;

export function isNotificationEnabled(prefs: NotificationPrefs | null | undefined, type: NotificationType): boolean {
  return prefs?.[type] !== false;
}
