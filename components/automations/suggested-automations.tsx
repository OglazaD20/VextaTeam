"use client";

import * as React from "react";
import { CheckIcon, Loader2Icon, SparklesIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { acceptSuggestion, dismissSuggestion, refreshSuggestions } from "@/app/(app)/automations/actions";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/types/database";

export function SuggestedAutomations({
  suggestions,
  onChanged,
}: {
  suggestions: Tables<"automation_suggestions">[];
  onChanged: () => void;
}) {
  const [isPending, startTransition] = React.useTransition();
  const [isRefreshing, startRefreshing] = React.useTransition();

  function handleAccept(id: string) {
    startTransition(async () => {
      const result = await acceptSuggestion(id);
      if (result.error) {
        toast.error("Couldn't create that automation", { description: result.error });
        return;
      }
      toast.success("Automation created");
      onChanged();
    });
  }

  function handleDismiss(id: string) {
    startTransition(async () => {
      const result = await dismissSuggestion(id);
      if (result.error) toast.error("Couldn't dismiss that", { description: result.error });
      onChanged();
    });
  }

  function handleRefresh() {
    startRefreshing(async () => {
      const result = await refreshSuggestions();
      if (result.error) {
        toast.error("Couldn't check for suggestions", { description: result.error });
        return;
      }
      if ((result.data?.created ?? 0) === 0) {
        toast.info("No new patterns found yet — keep logging and check back later.");
      }
      onChanged();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <SparklesIcon className="size-4" /> Suggested for you
        </h2>
        <Button size="sm" variant="ghost" onClick={handleRefresh} disabled={isRefreshing} className="gap-1.5">
          {isRefreshing ? <Loader2Icon className="size-3.5 animate-spin" /> : <SparklesIcon className="size-3.5" />}
          Check for patterns
        </Button>
      </div>

      {suggestions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No suggestions right now — LifeFlow looks for real patterns in your habits and mood over the last 30 days.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {suggestions.map((s) => (
            <div key={s.id} className="flex flex-col gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
              <p className="text-sm font-medium">{s.title}</p>
              <p className="text-xs text-muted-foreground">{s.description}</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleAccept(s.id)} disabled={isPending} className="gap-1">
                  <CheckIcon className="size-3.5" /> Automate it
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDismiss(s.id)} disabled={isPending} className="gap-1">
                  <XIcon className="size-3.5" /> Dismiss
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
