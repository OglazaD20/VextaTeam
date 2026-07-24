"use client";

import Link from "next/link";
import { AppleIcon, HeartPulseIcon, ListChecksIcon, SparklesIcon } from "lucide-react";

import { useUIStore } from "@/hooks/use-ui-store";

const LINKS = [
  { href: "/habits", label: "Habits", icon: ListChecksIcon },
  { href: "/nutrition", label: "Nutrition", icon: AppleIcon },
  { href: "/health", label: "Health", icon: HeartPulseIcon },
] as const;

/** One-tap access to the daily-touchpoint modules from Today, so mobile users don't need the hamburger menu for these. */
export function QuickAccessRow() {
  const toggleChat = useUIStore((state) => state.toggleChat);

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
      {LINKS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
        >
          <Icon className="size-3.5" />
          {label}
        </Link>
      ))}
      <button
        type="button"
        onClick={toggleChat}
        className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
      >
        <SparklesIcon className="size-3.5" />
        Assistant
      </button>
    </div>
  );
}
