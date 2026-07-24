import { CheckCircle2Icon, XCircleIcon } from "lucide-react";

import type { Tables } from "@/types/database";

function formatTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function SessionHistory({
  sessions,
}: {
  sessions: Tables<"focus_sessions">[];
}) {
  if (sessions.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        No focus sessions yet today.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {sessions.map((session) => (
        <div
          key={session.id}
          className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm"
        >
          <div className="flex items-center gap-2.5">
            {session.interrupted ? (
              <XCircleIcon className="size-4 text-muted-foreground" />
            ) : (
              <CheckCircle2Icon className="size-4 text-success" />
            )}
            <span>{formatTime(session.started_at)}</span>
            <span className="text-muted-foreground">
              {session.actual_duration_minutes ?? 0} min ·{" "}
              {session.pomodoro_cycles}{" "}
              {session.pomodoro_cycles === 1 ? "cycle" : "cycles"}
            </span>
          </div>
          {session.mood_after && (
            <span className="text-muted-foreground">
              {["😞", "😕", "😐", "🙂", "😄"][session.mood_after - 1]}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
