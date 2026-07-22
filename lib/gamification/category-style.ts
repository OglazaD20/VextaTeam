import type { AchievementCategory, AchievementTier } from "@/lib/gamification/achievements";

export const ACHIEVEMENT_CATEGORY_LABEL: Record<AchievementCategory, string> = {
  tasks: "Tasks",
  habits: "Habits",
  goals: "Goals",
  mood: "Mood",
  nutrition: "Nutrition",
  health: "Health",
  finance: "Finance",
  discover: "Discover",
  focus: "Focus",
  memory: "Memory",
  ai: "AI Assistant",
  streak: "Streaks",
  level: "Level",
  secret: "Secret",
};

export const ACHIEVEMENT_CATEGORY_ICON: Record<AchievementCategory, string> = {
  tasks: "✅",
  habits: "🔁",
  goals: "🎯",
  mood: "🙂",
  nutrition: "🍎",
  health: "💧",
  finance: "💰",
  discover: "🧭",
  focus: "⏱️",
  memory: "🧠",
  ai: "✨",
  streak: "🔥",
  level: "⭐",
  secret: "🔒",
};

export const ACHIEVEMENT_TIER_LABEL: Record<AchievementTier, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  legendary: "Legendary",
};

export const ACHIEVEMENT_TIER_COLOR: Record<AchievementTier, string> = {
  bronze: "#b08d57",
  silver: "#9ca3af",
  gold: "#eab308",
  platinum: "#38bdf8",
  legendary: "#a855f7",
};
