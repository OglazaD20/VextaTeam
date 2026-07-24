"use client";

import * as React from "react";
import { SmileIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { deleteMoodLog } from "@/app/(app)/mood/actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { MOOD_DIMENSIONS, MOOD_SCALE_EMOJI } from "@/lib/mood/dimensions";
import type { Tables } from "@/types/database";

function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function MoodTimeline({ logs }: { logs: Tables<"mood_logs">[] }) {
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function handleDelete(id: string) {
    setPendingId(id);
    const result = await deleteMoodLog(id);
    setPendingId(null);
    if (result.error) toast.error("Couldn't remove that entry", { description: result.error });
  }

  if (logs.length === 0) {
    return (
      <EmptyState
        icon={SmileIcon}
        title="No check-ins yet"
        description="Log how you're feeling and your timeline will build up here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {logs.map((log) => {
        const dimensionValues = MOOD_DIMENSIONS.filter((d) => d.key !== "mood").flatMap((d) => {
          const value = log[d.column as keyof Tables<"mood_logs">] as number | null;
          return value ? [{ label: d.label, emoji: MOOD_SCALE_EMOJI[value - 1] }] : [];
        });

        return (
          <div key={log.id} className="group flex items-start gap-3 rounded-xl border border-border p-3">
            <span className="text-2xl">{MOOD_SCALE_EMOJI[log.mood - 1]}</span>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">{formatTimestamp(log.logged_at)}</p>
              {dimensionValues.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {dimensionValues.map((d) => `${d.emoji} ${d.label}`).join(" · ")}
                </p>
              )}
              {log.note && <p className="pt-1 text-sm">{log.note}</p>}
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="size-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={() => handleDelete(log.id)}
              disabled={pendingId === log.id}
              aria-label="Delete check-in"
            >
              <Trash2Icon className="size-3.5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
