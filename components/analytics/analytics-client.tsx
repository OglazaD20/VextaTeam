"use client";

import * as React from "react";
import { Loader2Icon } from "lucide-react";

import { getAnalyticsScores, type AnalyticsPeriod, type AnalyticsScores, type LifeScoreTrendPoint } from "@/app/(app)/analytics/actions";
import { LifeScoreTrendChart } from "@/components/analytics/life-score-trend-chart";
import { ScoreCard } from "@/components/analytics/score-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PERIOD_OPTIONS: { value: AnalyticsPeriod; label: string }[] = [
  { value: "daily", label: "Today" },
  { value: "weekly", label: "This week" },
  { value: "monthly", label: "This month" },
  { value: "quarterly", label: "This quarter" },
  { value: "yearly", label: "This year" },
];

export function AnalyticsClient({
  initialScores,
  trend,
}: {
  initialScores: AnalyticsScores;
  trend: LifeScoreTrendPoint[];
}) {
  const [period, setPeriod] = React.useState<AnalyticsPeriod>("monthly");
  const [scores, setScores] = React.useState(initialScores);
  const [isLoading, setLoading] = React.useState(false);

  async function handlePeriodChange(next: AnalyticsPeriod) {
    setPeriod(next);
    setLoading(true);
    const result = await getAnalyticsScores(next);
    setLoading(false);
    if (result.data) setScores(result.data);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Select value={period} onValueChange={(v) => handlePeriodChange(v as AnalyticsPeriod)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isLoading && <Loader2Icon className="size-4 animate-spin text-muted-foreground" />}
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-2 pt-6">
          <span className="text-xs text-muted-foreground">Life Score</span>
          <span className="text-4xl font-semibold">{scores.life !== null ? Math.round(scores.life) : "—"}</span>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        <ScoreCard label="Productivity" score={scores.productivity} icon="⚡" />
        <ScoreCard label="Health" score={scores.health} icon="🩺" />
        <ScoreCard label="Lifestyle" score={scores.lifestyle} icon="🌿" />
        <ScoreCard label="Consistency" score={scores.consistency} icon="🔥" />
        <ScoreCard label="Balance" score={scores.balance} icon="⚖️" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Life Score — last 8 weeks</CardTitle>
        </CardHeader>
        <CardContent>
          <LifeScoreTrendChart points={trend} />
        </CardContent>
      </Card>
    </div>
  );
}
