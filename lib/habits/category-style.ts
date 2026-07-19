import type { HabitCategory } from "@/types/database";

export const HABIT_CATEGORY_LABEL: Record<HabitCategory, string> = {
  sleep: "Sleep",
  fitness: "Fitness",
  hydration: "Hydration",
  reading: "Reading",
  mindfulness: "Mindfulness",
  movement: "Movement",
  custom: "Custom",
};

export const HABIT_CATEGORY_ICON: Record<HabitCategory, string> = {
  sleep: "😴",
  fitness: "🏋️",
  hydration: "💧",
  reading: "📖",
  mindfulness: "🧘",
  movement: "🚶",
  custom: "✨",
};
