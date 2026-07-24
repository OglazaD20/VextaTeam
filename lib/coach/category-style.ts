import {
  AppleIcon,
  BriefcaseIcon,
  HeartPulseIcon,
  ListChecksIcon,
  SmileIcon,
  SparklesIcon,
  TargetIcon,
  TrophyIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";

import type { CoachingCategory } from "@/lib/ai/generate-coaching";

export const COACHING_CATEGORY_ICON: Record<CoachingCategory, LucideIcon> = {
  productivity: BriefcaseIcon,
  health: HeartPulseIcon,
  mood: SmileIcon,
  finance: WalletIcon,
  goals: TargetIcon,
  habits: ListChecksIcon,
  nutrition: AppleIcon,
  achievements: TrophyIcon,
  general: SparklesIcon,
};

export const COACHING_CATEGORY_COLOR: Record<CoachingCategory, string> = {
  productivity: "#3b82f6",
  health: "#ef4444",
  mood: "#f59e0b",
  finance: "#22c55e",
  goals: "#a855f7",
  habits: "#06b6d4",
  nutrition: "#f97316",
  achievements: "#eab308",
  general: "#6b7280",
};
