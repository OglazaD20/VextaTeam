import Link from "next/link";
import { CheckCircle2Icon, TrophyIcon } from "lucide-react";

import { EveningReflection } from "@/components/dashboard/evening-reflection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ACHIEVEMENT_TIER_COLOR } from "@/lib/gamification/category-style";
import type { AchievementTier } from "@/lib/gamification/achievements";
import { CATEGORY_VAR } from "@/lib/scheduling/category-style";
import type { Tables } from "@/types/database";

export interface EveningSectionProps {
  completedToday: number;
  totalToday: number;
  achievementsToday: { id: string; title: string; tier: AchievementTier }[];
  caloriesConsumed: number;
  calorieGoal: number;
  tomorrowPreview: Pick<Tables<"schedule_items">, "id" | "title" | "type" | "scheduled_start">[];
  goalsProgress: { id: string; title: string; pct: number }[];
}

function formatTime(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

export function EveningSection({
  completedToday,
  totalToday,
  achievementsToday,
  caloriesConsumed,
  calorieGoal,
  tomorrowPreview,
  goalsProgress,
}: EveningSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <Card className="glass-surface">
        <CardHeader>
          <CardTitle className="text-base">Today in review</CardTitle>
        </CardHeader>
        <CardContent>
          <EveningReflection />
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="glass-surface">
          <CardHeader>
            <CardTitle className="text-base">Completed today</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="flex items-center gap-2 text-2xl font-semibold">
              <CheckCircle2Icon className="size-5 text-success" />
              {completedToday}
              <span className="text-base font-normal text-muted-foreground"> / {totalToday} tasks</span>
            </p>
          </CardContent>
        </Card>

        <Card className="glass-surface">
          <CardHeader>
            <CardTitle className="text-base">Nutrition summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {caloriesConsumed}
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                {calorieGoal ? `/ ${calorieGoal} kcal` : "kcal today"}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {achievementsToday.length > 0 && (
        <Card className="glass-surface">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Unlocked today</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href="/analytics">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {achievementsToday.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-sm">
                <TrophyIcon className="size-4" style={{ color: ACHIEVEMENT_TIER_COLOR[a.tier] }} />
                <span className="truncate">{a.title}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {goalsProgress.length > 0 && (
        <Card className="glass-surface">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Goals progress</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href="/goals">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {goalsProgress.map((g) => (
              <div key={g.id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">{g.title}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {g.pct}%
                  </Badge>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${g.pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {tomorrowPreview.length > 0 && (
        <Card className="glass-surface">
          <CardHeader>
            <CardTitle className="text-base">Tomorrow preview</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {tomorrowPreview.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                <span className="size-2 rounded-full" style={{ backgroundColor: CATEGORY_VAR[item.type] }} />
                <span className="truncate">
                  {formatTime(item.scheduled_start)} · {item.title}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
