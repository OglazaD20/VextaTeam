"use client";

import * as React from "react";
import { BellIcon, CheckCheckIcon } from "lucide-react";

import { useTranslations } from "@/components/i18n/i18n-provider";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/notifications/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatMessage } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/dictionaries";
import { LOCALE_INTL_TAG } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";

const TYPE_ICON: Record<string, string> = {
  free_time: "🕐",
  break_reminder: "☕",
  habit_skip: "🔥",
  reschedule: "🔀",
  leave_now: "🚗",
  weather: "🌦️",
  weekly_report: "📊",
};

function formatRelativeTime(iso: string, messages: Messages, locale: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return messages.common.justNow;
  if (minutes < 60) return formatMessage(messages.common.minutesAgo, { n: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return formatMessage(messages.common.hoursAgo, { n: hours });
  return new Date(iso).toLocaleDateString(locale);
}

export function NotificationsBell({
  notifications,
}: {
  notifications: Tables<"notifications">[];
}) {
  const [isPending, startTransition] = React.useTransition();
  const { messages, locale } = useTranslations();
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={messages.topbar.notifications}>
          <BellIcon />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full p-0 text-[10px]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
          <p className="text-sm font-medium">{messages.topbar.notifications}</p>
          {unreadCount > 0 && (
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(() => {
                  void markAllNotificationsRead();
                })
              }
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheckIcon className="size-3.5" /> {messages.topbar.markAllRead}
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-3.5 py-6 text-center text-sm text-muted-foreground">
              {messages.topbar.notificationsEmpty}
            </p>
          ) : (
            notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() =>
                  !notification.read_at &&
                  startTransition(() => {
                    void markNotificationRead(notification.id);
                  })
                }
                className={cn(
                  "flex w-full gap-2.5 border-b border-border px-3.5 py-3 text-left last:border-b-0 hover:bg-accent",
                  !notification.read_at && "bg-accent/40",
                )}
              >
                <span className="text-base leading-none">
                  {TYPE_ICON[notification.type] ?? "🔔"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{notification.title}</p>
                  <p className="text-xs text-muted-foreground">{notification.body}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatRelativeTime(notification.created_at, messages, LOCALE_INTL_TAG[locale])}
                  </p>
                </div>
                {!notification.read_at && (
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
