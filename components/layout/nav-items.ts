import {
  CalendarClockIcon,
  CalendarDaysIcon,
  LayoutDashboardIcon,
  LayoutGridIcon,
  ListChecksIcon,
  SettingsIcon,
  SparklesIcon,
  TimerIcon,
} from "lucide-react";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGridIcon },
  { href: "/today", label: "Today", icon: LayoutDashboardIcon },
  { href: "/calendar", label: "Calendar", icon: CalendarDaysIcon },
  { href: "/habits", label: "Habits", icon: ListChecksIcon },
  { href: "/focus", label: "Focus", icon: TimerIcon },
  { href: "/stats", label: "Stats", icon: CalendarClockIcon },
  { href: "/chat", label: "Assistant", icon: SparklesIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
] as const;
