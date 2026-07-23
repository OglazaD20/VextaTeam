import type { Metadata } from "next";

import { getAchievementsOverview } from "@/app/(app)/achievements/actions";
import {
  getAnalyticsCenterSummary,
  getAnalyticsScores,
  getLifeScoreTrend,
  getProductivityWeekBundle,
} from "@/app/(app)/analytics/actions";
import { AnalyticsCenterClient } from "@/components/analytics/analytics-center-client";

export const metadata: Metadata = { title: "Analytics — LifeFlow" };

export default async function AnalyticsPage() {
  const [scoresResult, trendResult, summaryResult, achievementsResult, weekBundleResult] = await Promise.all([
    getAnalyticsScores("monthly"),
    getLifeScoreTrend(8),
    getAnalyticsCenterSummary(),
    getAchievementsOverview(),
    getProductivityWeekBundle(),
  ]);

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Your life, scored and summarized across every module.</p>
      </div>

      {scoresResult.error || summaryResult.error ? (
        <p className="text-sm text-destructive">{scoresResult.error ?? summaryResult.error}</p>
      ) : (
        <AnalyticsCenterClient
          initialScores={
            scoresResult.data ?? { productivity: null, health: null, lifestyle: null, consistency: null, balance: null, life: null }
          }
          trend={trendResult.data ?? []}
          summary={summaryResult.data!}
          achievements={achievementsResult.data ?? null}
          weekBundle={weekBundleResult.data ?? null}
        />
      )}
    </div>
  );
}
