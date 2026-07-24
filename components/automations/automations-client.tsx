"use client";

import * as React from "react";
import { PlusIcon, ZapIcon } from "lucide-react";

import type { AutomationsOverview } from "@/app/(app)/automations/actions";
import { getAutomationsOverview } from "@/app/(app)/automations/actions";
import { AiAutomationComposer } from "@/components/automations/ai-automation-composer";
import { AutomationBuilderDialog, EMPTY_DRAFT, type AutomationDraft } from "@/components/automations/automation-builder-dialog";
import { AutomationCard } from "@/components/automations/automation-card";
import { AutomationHistoryDialog } from "@/components/automations/automation-history-dialog";
import { SuggestedAutomations } from "@/components/automations/suggested-automations";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import type { AutomationAction, AutomationCondition, AutomationTrigger } from "@/lib/automations/types";

export function AutomationsClient({ initialOverview }: { initialOverview: AutomationsOverview }) {
  const [overview, setOverview] = React.useState(initialOverview);
  const [builderOpen, setBuilderOpen] = React.useState(false);
  const [builderKey, setBuilderKey] = React.useState(0);
  const [draft, setDraft] = React.useState<AutomationDraft>(EMPTY_DRAFT);
  const [historyAutomationId, setHistoryAutomationId] = React.useState<string | null>(null);

  function refresh() {
    getAutomationsOverview().then((result) => {
      if (result.data) setOverview(result.data);
    });
  }

  function openNewAutomation() {
    setDraft(EMPTY_DRAFT);
    setBuilderKey((k) => k + 1);
    setBuilderOpen(true);
  }

  function openEditAutomation(automation: AutomationsOverview["automations"][number]) {
    setDraft({
      id: automation.id,
      name: automation.name,
      description: automation.description ?? "",
      trigger: automation.trigger as unknown as AutomationTrigger,
      conditionGroups: automation.condition_groups as unknown as AutomationCondition[][],
      actions: automation.actions as unknown as AutomationAction[],
      enabled: automation.enabled,
    });
    setBuilderKey((k) => k + 1);
    setBuilderOpen(true);
  }

  function openAiDraft(aiDraft: AutomationDraft) {
    setDraft(aiDraft);
    setBuilderKey((k) => k + 1);
    setBuilderOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <ZapIcon className="size-5 text-primary" /> Automations
          </h1>
          <p className="text-sm text-muted-foreground">
            IF/THEN workflows that run for you — on a schedule or when something real happens.
          </p>
        </div>
        <Button onClick={openNewAutomation} className="gap-1.5">
          <PlusIcon className="size-4" /> New automation
        </Button>
      </div>

      <AiAutomationComposer onDraftReady={openAiDraft} />

      <SuggestedAutomations suggestions={overview.suggestions} onChanged={refresh} />

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Your automations</h2>
        {overview.automations.length === 0 ? (
          <EmptyState
            icon={ZapIcon}
            title="No automations yet"
            description="Describe one in plain language above, or build one from scratch."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {overview.automations.map((automation) => (
              <AutomationCard
                key={automation.id}
                automation={automation}
                onEdit={() => openEditAutomation(automation)}
                onShowHistory={() => setHistoryAutomationId(automation.id)}
                onChanged={refresh}
              />
            ))}
          </div>
        )}
      </div>

      <AutomationBuilderDialog
        key={builderKey}
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        initialDraft={draft}
        onSaved={refresh}
      />
      <AutomationHistoryDialog
        key={historyAutomationId}
        automationId={historyAutomationId}
        open={historyAutomationId !== null}
        onOpenChange={(open) => !open && setHistoryAutomationId(null)}
      />
    </div>
  );
}
