import type { LucideIcon } from "lucide-react";
import {
  AppleIcon,
  BrainIcon,
  CalendarDaysIcon,
  ChartNoAxesCombinedIcon,
  CompassIcon,
  GraduationCapIcon,
  HeartPulseIcon,
  LayoutDashboardIcon,
  LayoutGridIcon,
  ListChecksIcon,
  PlaneIcon,
  SettingsIcon,
  SmileIcon,
  SparklesIcon,
  TargetIcon,
  TimerIcon,
  TrendingUpIcon,
  WalletIcon,
  ZapIcon,
} from "lucide-react";

import type { Messages } from "@/lib/i18n/messages/en";

type NavLabelKey = keyof Messages["nav"];

/** labelKey indexes lib/i18n/messages/*.ts `nav.*`, translated at render time in sidebar-nav.tsx/mobile-nav.tsx. */
export const NAV_ITEMS = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutGridIcon },
  { href: "/today", labelKey: "today", icon: LayoutDashboardIcon },
  { href: "/calendar", labelKey: "calendar", icon: CalendarDaysIcon },
  { href: "/goals", labelKey: "goals", icon: TargetIcon },
  { href: "/habits", labelKey: "habits", icon: ListChecksIcon },
  { href: "/mood", labelKey: "mood", icon: SmileIcon },
  { href: "/nutrition", labelKey: "nutrition", icon: AppleIcon },
  { href: "/health", labelKey: "health", icon: HeartPulseIcon },
  { href: "/finance", labelKey: "finance", icon: WalletIcon },
  { href: "/discover", labelKey: "discover", icon: CompassIcon },
  { href: "/travel", labelKey: "travel", icon: PlaneIcon },
  { href: "/learn", labelKey: "learn", icon: GraduationCapIcon },
  { href: "/predict", labelKey: "predict", icon: TrendingUpIcon },
  { href: "/memory", labelKey: "memory", icon: BrainIcon },
  { href: "/analytics", labelKey: "analytics", icon: ChartNoAxesCombinedIcon },
  { href: "/automations", labelKey: "automations", icon: ZapIcon },
  { href: "/focus", labelKey: "focus", icon: TimerIcon },
  { href: "/chat", labelKey: "assistant", icon: SparklesIcon },
  { href: "/settings", labelKey: "settings", icon: SettingsIcon },
] as const satisfies readonly { href: string; labelKey: NavLabelKey; icon: LucideIcon }[];
