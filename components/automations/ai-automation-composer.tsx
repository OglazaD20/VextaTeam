"use client";

import * as React from "react";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";

import { generateAutomationFromText } from "@/app/(app)/automations/actions";
import type { AutomationDraft } from "@/components/automations/automation-builder-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const EXAMPLES = [
  "Every weekday at 8am remind me to check my calendar",
  "When I complete a high-priority task, give me 20 bonus XP",
  "Every Sunday at 6pm remind me to plan the week",
];

export function AiAutomationComposer({ onDraftReady }: { onDraftReady: (draft: AutomationDraft) => void }) {
  const [value, setValue] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  function handleGenerate() {
    if (!value.trim()) return;
    startTransition(async () => {
      const result = await generateAutomationFromText(value);
      if (result.error || !result.parsed) {
        toast.error("Couldn't build that automation", { description: result.error });
        return;
      }
      const parsed = result.parsed;
      onDraftReady({
        name: parsed.name,
        description: parsed.description,
        trigger: parsed.trigger as AutomationDraft["trigger"],
        conditionGroups: parsed.conditionGroups as AutomationDraft["conditionGroups"],
        actions: parsed.actions as AutomationDraft["actions"],
        enabled: true,
      });
      setValue("");
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <SparklesIcon className="size-4 text-primary" /> Describe an automation in your own words
      </p>
      <div className="flex flex-wrap gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleGenerate();
            }
          }}
          placeholder={`Try: "${EXAMPLES[0]}"`}
          className="flex-1"
        />
        <Button onClick={handleGenerate} disabled={isPending || !value.trim()} className="gap-1.5">
          {isPending ? <Loader2Icon className="size-4 animate-spin" /> : <SparklesIcon className="size-4" />}
          Build it
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">You&apos;ll review and can edit it before saving.</p>
    </div>
  );
}
