import type { Metadata } from "next";

import { getGoals } from "@/app/(app)/goals/actions";
import { GoalEditorDialog } from "@/components/goals/goal-editor-dialog";
import { GoalList } from "@/components/goals/goal-list";

export const metadata: Metadata = { title: "Goals — LifeFlow" };

export default async function GoalsPage() {
  const result = await getGoals();

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Goals</h1>
          <p className="text-sm text-muted-foreground">
            Long-term ambitions, broken into milestones and daily action.
          </p>
        </div>
        <GoalEditorDialog />
      </div>

      {result.error ? (
        <p className="text-sm text-destructive">{result.error}</p>
      ) : (
        <GoalList goals={result.data ?? []} />
      )}
    </div>
  );
}
