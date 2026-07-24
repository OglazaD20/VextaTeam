"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarSyncIcon, Loader2Icon, UnlinkIcon } from "lucide-react";
import { toast } from "sonner";

import { disconnectCalendar } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/types/database";

function formatRelativeTime(iso: string | null) {
  if (!iso) return "never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function CalendarConnections({
  connections,
}: {
  connections: Tables<"calendar_connections">[];
}) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = React.useState<string | null>(null);
  const [isDisconnecting, setIsDisconnecting] = React.useState<string | null>(null);

  const google = connections.find((c) => c.provider === "google");

  async function handleSync(connectionId: string) {
    setIsSyncing(connectionId);
    try {
      const response = await fetch("/api/calendar/google/sync", { method: "POST" });
      const result = await response.json();
      if (!response.ok || result.error) {
        toast.error("Sync failed", { description: result.error });
        return;
      }
      toast.success(`Synced ${result.synced} event${result.synced === 1 ? "" : "s"}`);
      router.refresh();
    } catch {
      toast.error("Couldn't reach the sync endpoint");
    } finally {
      setIsSyncing(null);
    }
  }

  async function handleDisconnect(connectionId: string) {
    setIsDisconnecting(connectionId);
    const result = await disconnectCalendar(connectionId);
    if (result.error) {
      toast.error("Couldn't disconnect", { description: result.error });
    } else {
      toast.success("Calendar disconnected");
    }
    setIsDisconnecting(null);
  }

  if (!google) {
    return (
      <Button variant="outline" asChild>
        <a href="/api/calendar/google/connect">
          <CalendarSyncIcon /> Connect Google Calendar
        </a>
      </Button>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-border px-3.5 py-2.5">
      <div>
        <p className="text-sm font-medium">{google.account_email ?? "Google Calendar"}</p>
        <p className="text-xs text-muted-foreground">
          {google.sync_status === "error" ? "Sync error — " : ""}
          Last synced {formatRelativeTime(google.last_synced_at)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSync(google.id)}
          disabled={isSyncing === google.id}
        >
          {isSyncing === google.id ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <CalendarSyncIcon />
          )}
          Sync now
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDisconnect(google.id)}
          disabled={isDisconnecting === google.id}
        >
          <UnlinkIcon /> Disconnect
        </Button>
      </div>
    </div>
  );
}
