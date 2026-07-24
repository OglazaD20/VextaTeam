import Link from "next/link";
import { DumbbellIcon } from "lucide-react";

import { StatCard } from "@/components/stats/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BudgetUsage } from "@/lib/finance/calculations";
import { CATEGORY_VAR } from "@/lib/scheduling/category-style";
import type { Tables } from "@/types/database";

export interface AfternoonSectionProps {
  remainingTasks: Pick<Tables<"schedule_items">, "id" | "title" | "type">[];
  caloriesConsumed: number;
  calorieGoal: number;
  steps: number | null;
  waterMl: number;
  waterGoalMl: number;
  hasLoggedWorkoutToday: boolean;
  budgetUsage: BudgetUsage[];
}

export function AfternoonSection({
  remainingTasks,
  caloriesConsumed,
  calorieGoal,
  steps,
  waterMl,
  waterGoalMl,
  hasLoggedWorkoutToday,
  budgetUsage,
}: AfternoonSectionProps) {
  const overBudget = budgetUsage.filter((b) => b.isOverBudget);
  const closestToLimit = [...budgetUsage].sort((a, b) => b.pctUsed - a.pctUsed).slice(0, 2);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Calories" value={`${caloriesConsumed}`} sublabel={calorieGoal ? `of ${calorieGoal} goal` : undefined} />
        <StatCard label="Steps" value={steps !== null ? steps.toLocaleString() : "—"} />
        <StatCard label="Hydration" value={`${waterMl}ml`} sublabel={`of ${waterGoalMl}ml`} />
        <StatCard label="Tasks left" value={String(remainingTasks.length)} />
      </div>

      <Card className="glass-surface">
        <CardHeader>
          <CardTitle className="text-base">Remaining today</CardTitle>
        </CardHeader>
        <CardContent>
          {remainingTasks.length > 0 ? (
            <div className="flex flex-col gap-2">
              {remainingTasks.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-sm">
                  <span className="size-2 rounded-full" style={{ backgroundColor: CATEGORY_VAR[item.type] }} />
                  <span className="truncate">{item.title}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Everything for today is done — nice work.</p>
          )}
        </CardContent>
      </Card>

      <Card className="glass-surface">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Workout reminder</CardTitle>
          {!hasLoggedWorkoutToday && (
            <Button asChild size="sm" variant="outline">
              <Link href="/health">Log exercise</Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <DumbbellIcon className="size-4" />
            {hasLoggedWorkoutToday
              ? "Already logged a workout today — great."
              : "No exercise logged yet today — a short walk still counts."}
          </p>
        </CardContent>
      </Card>

      {budgetUsage.length > 0 && (
        <Card className="glass-surface">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Budget overview</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href="/finance">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {closestToLimit.map((b) => (
              <div key={b.category} className="flex items-center justify-between text-sm">
                <span className="capitalize">{b.category}</span>
                <Badge variant={b.isOverBudget ? "destructive" : "outline"} className="text-[10px]">
                  {b.pctUsed}% used
                </Badge>
              </div>
            ))}
            {overBudget.length > 0 && (
              <p className="text-xs text-destructive">
                {overBudget.length === 1 ? "1 category is" : `${overBudget.length} categories are`} over budget this month.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
