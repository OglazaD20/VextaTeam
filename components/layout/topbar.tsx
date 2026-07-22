"use client";

import { MenuIcon, SparklesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { useUIStore } from "@/hooks/use-ui-store";
import type { Tables } from "@/types/database";

export function TopBar({
  onOpenMobileNav,
  user,
  notifications,
  equippedFrameId,
}: {
  onOpenMobileNav: () => void;
  user: { name: string | null; email: string | null; avatarUrl: string | null };
  notifications: Tables<"notifications">[];
  equippedFrameId: string;
}) {
  const toggleChat = useUIStore((state) => state.toggleChat);
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4 sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
      >
        <MenuIcon />
      </Button>

      <p className="text-sm font-medium text-muted-foreground">{today}</p>

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="xl:hidden"
          onClick={toggleChat}
          aria-label="Toggle assistant"
        >
          <SparklesIcon />
        </Button>
        <NotificationsBell notifications={notifications} />
        <ThemeToggle />
        <UserMenu {...user} equippedFrameId={equippedFrameId} />
      </div>
    </header>
  );
}
