"use client";

import * as React from "react";
import { BookmarkIcon, CalendarIcon, MapPinIcon, TicketIcon, TrashIcon } from "lucide-react";
import { toast } from "sonner";

import { unsaveActivity } from "@/app/(app)/discover/actions";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/types/database";

function formatSavedDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SavedActivitiesList({ initial }: { initial: Tables<"saved_activities">[] }) {
  const [saved, setSaved] = React.useState(initial);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function handleRemove(id: string) {
    setPendingId(id);
    const result = await unsaveActivity(id);
    setPendingId(null);
    if (result.error) {
      toast.error("Couldn't remove that", { description: result.error });
      return;
    }
    setSaved((prev) => prev.filter((item) => item.id !== id));
    toast.success("Removed from saved");
  }

  if (saved.length === 0) {
    return (
      <EmptyState
        icon={BookmarkIcon}
        title="Nothing saved yet"
        description="Tap Save on a suggestion or event to keep it here for later."
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {saved.map((item) => {
        const url = typeof item.data.url === "string" ? item.data.url : null;
        const startsAt = formatSavedDate(item.starts_at);
        return (
          <div
            key={item.id}
            className="glass-surface flex flex-col gap-2 rounded-2xl border border-border p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPinIcon className="size-3" />
                  {item.subtitle}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 shrink-0"
                onClick={() => handleRemove(item.id)}
                disabled={pendingId === item.id}
              >
                <TrashIcon className="size-3.5" />
                <span className="sr-only">Remove</span>
              </Button>
            </div>
            {startsAt && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarIcon className="size-3" />
                {startsAt}
              </p>
            )}
            {item.kind === "event" && url && (
              <Button size="sm" variant="outline" asChild className="self-start">
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <TicketIcon className="size-3.5" /> Tickets
                </a>
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
