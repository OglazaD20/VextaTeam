"use client";

import * as React from "react";
import { TargetIcon } from "lucide-react";

import type { GoalWithMilestones } from "@/app/(app)/goals/actions";
import { GoalCard } from "@/components/goals/goal-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function GoalList({ goals }: { goals: GoalWithMilestones[] }) {
  const active = goals.filter((g) => g.status === "active");
  const completed = goals.filter((g) => g.status === "completed");
  const archived = goals.filter((g) => g.status === "archived");

  return (
    <Tabs defaultValue="active" className="flex flex-col gap-4">
      <TabsList>
        <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
        <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        <TabsTrigger value="archived">Archived ({archived.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="active" className="flex flex-col gap-3">
        {active.length === 0 ? (
          <EmptyState
            icon={TargetIcon}
            title="No active goals"
            description="Set a goal and let AI break it into milestones and a first plan of action."
          />
        ) : (
          active.map((goal) => <GoalCard key={goal.id} goal={goal} />)
        )}
      </TabsContent>

      <TabsContent value="completed" className="flex flex-col gap-3">
        {completed.length === 0 ? (
          <EmptyState icon={TargetIcon} title="No completed goals yet" description="Finished goals show up here." />
        ) : (
          completed.map((goal) => <GoalCard key={goal.id} goal={goal} />)
        )}
      </TabsContent>

      <TabsContent value="archived" className="flex flex-col gap-3">
        {archived.length === 0 ? (
          <EmptyState icon={TargetIcon} title="Nothing archived" description="Archived goals show up here." />
        ) : (
          archived.map((goal) => <GoalCard key={goal.id} goal={goal} />)
        )}
      </TabsContent>
    </Tabs>
  );
}
