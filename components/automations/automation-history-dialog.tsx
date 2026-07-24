"use client";

import * as React from "react";
import { CheckCircle2Icon, CircleSlashIcon, XCircleIcon } from "lucide-react";

import { getAutomationRuns } from "@/app/(app)/automations/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Tables } from "@/types/database";

const STATUS_ICON: Record<Tables<"automation_runs">["status"], React.ReactNode> = {
  matched: <CheckCircle2Icon className="size-4 text-success" />,
  skipped: <CircleSlashIcon className="size-4 text-muted-foreground" />,
  error: <XCircleIcon className="size-4 text-destructive" />,
};

export function AutomationHistoryDialog({
  automationId,
  open,
  onOpenChange,
}: {
  automationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [runs, setRuns] = React.useState<Tables<"automation_runs">[] | null>(null);

  React.useEffect(() => {
    if (!open || !automationId) return;
    getAutomationRuns(automationId).then((result) => setRuns(result.data ?? []));
  }, [open, automationId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Run history</DialogTitle>
        </DialogHeader>

        {runs === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">This automation hasn&apos;t run yet.</p>
        ) : (
          <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
            {runs.map((run) => (
              <div key={run.id} className="flex items-start gap-2 rounded-lg border border-border p-2 text-sm">
                {STATUS_ICON[run.status]}
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">{new Date(run.ran_at).toLocaleString()}</p>
                  <p className="capitalize">{run.status}</p>
                  {run.error_message && <p className="text-xs text-destructive">{run.error_message}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
