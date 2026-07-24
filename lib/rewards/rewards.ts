/**
 * Reward definitions live in code (not the database) — same pattern as
 * lib/gamification/achievements.ts. Ownership (lib/gamification/engine.ts
 * grants a reward automatically the moment its linked achievement unlocks)
 * and the user's current per-category equip choice are the only things
 * stored in Postgres.
 */

import type { AchievementId } from "@/lib/gamification/achievements";

export type RewardCategory = "theme" | "frame" | "effect";

export interface ThemeVariant {
  primary: string;
  ring: string;
  accent: string;
}

export interface ThemeRewardData {
  light: ThemeVariant;
  dark: ThemeVariant;
  swatch: string;
}

export interface FrameRewardData {
  /** Solid ring color; omitted for the animated "legendary" frame. */
  ringColor?: string;
  legendary?: boolean;
  swatch: string;
}

export interface RewardDef {
  id: string;
  title: string;
  description: string;
  category: RewardCategory;
  /** Always owned, no achievement required — the default equip for its category. */
  free: boolean;
  unlockAchievementId?: AchievementId;
  theme?: ThemeRewardData;
  frame?: FrameRewardData;
}

export const REWARDS: RewardDef[] = [
  {
    id: "theme_default",
    title: "Ocean Blue",
    description: "The default LifeFlow accent.",
    category: "theme",
    free: true,
    theme: {
      light: { primary: "oklch(0.52 0.18 265)", ring: "oklch(0.52 0.18 265 / 0.5)", accent: "oklch(0.95 0.02 265)" },
      dark: { primary: "oklch(0.72 0.15 265)", ring: "oklch(0.72 0.15 265 / 0.5)", accent: "oklch(0.28 0.02 265)" },
      swatch: "oklch(0.52 0.18 265)",
    },
  },
  {
    id: "theme_sunset",
    title: "Sunset Orange",
    description: "Unlocked for completing 50 tasks.",
    category: "theme",
    free: false,
    unlockAchievementId: "tasks_completed_50",
    theme: {
      light: { primary: "oklch(0.65 0.18 45)", ring: "oklch(0.65 0.18 45 / 0.5)", accent: "oklch(0.95 0.05 45)" },
      dark: { primary: "oklch(0.75 0.16 45)", ring: "oklch(0.75 0.16 45 / 0.5)", accent: "oklch(0.3 0.06 45)" },
      swatch: "oklch(0.65 0.18 45)",
    },
  },
  {
    id: "theme_forest",
    title: "Forest Green",
    description: "Unlocked for logging 50 habit check-ins.",
    category: "theme",
    free: false,
    unlockAchievementId: "habit_logs_50",
    theme: {
      light: { primary: "oklch(0.55 0.15 150)", ring: "oklch(0.55 0.15 150 / 0.5)", accent: "oklch(0.95 0.03 150)" },
      dark: { primary: "oklch(0.72 0.14 150)", ring: "oklch(0.72 0.14 150 / 0.5)", accent: "oklch(0.28 0.04 150)" },
      swatch: "oklch(0.55 0.15 150)",
    },
  },
  {
    id: "theme_royal",
    title: "Royal Purple",
    description: "Unlocked for completing 5 goals.",
    category: "theme",
    free: false,
    unlockAchievementId: "goals_completed_5",
    theme: {
      light: { primary: "oklch(0.5 0.19 300)", ring: "oklch(0.5 0.19 300 / 0.5)", accent: "oklch(0.95 0.03 300)" },
      dark: { primary: "oklch(0.72 0.16 300)", ring: "oklch(0.72 0.16 300 / 0.5)", accent: "oklch(0.28 0.05 300)" },
      swatch: "oklch(0.5 0.19 300)",
    },
  },
  {
    id: "theme_rose",
    title: "Rose",
    description: "Unlocked for logging 50 mood check-ins.",
    category: "theme",
    free: false,
    unlockAchievementId: "mood_checkins_50",
    theme: {
      light: { primary: "oklch(0.6 0.19 10)", ring: "oklch(0.6 0.19 10 / 0.5)", accent: "oklch(0.95 0.04 10)" },
      dark: { primary: "oklch(0.75 0.16 10)", ring: "oklch(0.75 0.16 10 / 0.5)", accent: "oklch(0.3 0.05 10)" },
      swatch: "oklch(0.6 0.19 10)",
    },
  },
  {
    id: "theme_midnight_gold",
    title: "Midnight Gold",
    description: "Unlocked for reaching level 10.",
    category: "theme",
    free: false,
    unlockAchievementId: "level_reached_10",
    theme: {
      light: { primary: "oklch(0.62 0.15 85)", ring: "oklch(0.62 0.15 85 / 0.5)", accent: "oklch(0.95 0.04 85)" },
      dark: { primary: "oklch(0.78 0.14 85)", ring: "oklch(0.78 0.14 85 / 0.5)", accent: "oklch(0.3 0.05 85)" },
      swatch: "oklch(0.62 0.15 85)",
    },
  },

  {
    id: "frame_none",
    title: "No Frame",
    description: "The default — a plain avatar.",
    category: "frame",
    free: true,
    frame: { swatch: "transparent" },
  },
  {
    id: "frame_bronze",
    title: "Bronze Ring",
    description: "Unlocked for completing 10 tasks.",
    category: "frame",
    free: false,
    unlockAchievementId: "tasks_completed_10",
    frame: { ringColor: "#b08d57", swatch: "#b08d57" },
  },
  {
    id: "frame_silver",
    title: "Silver Ring",
    description: "Unlocked for a 30-day habit streak.",
    category: "frame",
    free: false,
    unlockAchievementId: "habit_streak_30",
    frame: { ringColor: "#9ca3af", swatch: "#9ca3af" },
  },
  {
    id: "frame_gold",
    title: "Gold Ring",
    description: "Unlocked for reaching level 25.",
    category: "frame",
    free: false,
    unlockAchievementId: "level_reached_25",
    frame: { ringColor: "#eab308", swatch: "#eab308" },
  },
  {
    id: "frame_legendary",
    title: "Legendary Aura",
    description: "Unlocked for a perfect week — logging something every day for 7 days straight.",
    category: "frame",
    free: false,
    unlockAchievementId: "secret_perfect_week",
    frame: { legendary: true, swatch: "conic-gradient(from 0deg, #a855f7, #ec4899, #eab308, #22c55e, #3b82f6, #a855f7)" },
  },

  {
    id: "effect_none",
    title: "No Celebration",
    description: "The default — a quiet unlock, no animation.",
    category: "effect",
    free: true,
  },
  {
    id: "effect_confetti",
    title: "Confetti Bursts",
    description: "Unlocked for completing your first goal — fires a confetti burst on the Achievements page when a new one unlocks.",
    category: "effect",
    free: false,
    unlockAchievementId: "goals_completed_1",
  },
];

export const REWARDS_BY_ID = new Map(REWARDS.map((r) => [r.id, r]));

export function defaultRewardIdForCategory(category: RewardCategory): string {
  return REWARDS.find((r) => r.category === category && r.free)!.id;
}
