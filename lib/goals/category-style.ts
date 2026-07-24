import type { GoalCategory } from "@/types/database";

export const GOAL_CATEGORY_LABEL: Record<GoalCategory, string> = {
  fitness: "Fitness",
  business: "Business",
  learning: "Learning",
  finance: "Finance",
  reading: "Reading",
  career: "Career",
  travel: "Travel",
  personal: "Personal",
  health: "Health",
  custom: "Custom",
};

export const GOAL_CATEGORY_ICON: Record<GoalCategory, string> = {
  fitness: "🏋️",
  business: "💼",
  learning: "🎓",
  finance: "💰",
  reading: "📚",
  career: "📈",
  travel: "✈️",
  personal: "🌱",
  health: "🩺",
  custom: "🎯",
};

export const GOAL_CATEGORY_COLOR: Record<GoalCategory, string> = {
  fitness: "var(--macro-protein)",
  business: "var(--primary)",
  learning: "var(--macro-carbs)",
  finance: "var(--success)",
  reading: "var(--macro-fat)",
  career: "var(--primary)",
  travel: "var(--warning)",
  personal: "var(--success)",
  health: "var(--destructive)",
  custom: "var(--muted-foreground)",
};
