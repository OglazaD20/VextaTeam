import type { Metadata } from "next";

import { getAnalyticsScores, getLifeScoreTrend } from "@/app/(app)/analytics/actions";
import { AnalyticsClient } from "@/components/analytics/analytics-client";

export const metadata: Metadata = { title: "Analytics — LifeFlow" };

export default async function AnalyticsPage() {
  const [scoresResult, trendResult] = await Promise.all([getAnalyticsScores("monthly"), getLifeScoreTrend(8)]);

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Your life, scored across every module.</p>
      </div>

      {scoresResult.error ? (
        <p className="text-sm text-destructive">{scoresResult.error}</p>
      ) : (
        <AnalyticsClient
          initialScores={
            scoresResult.data ?? { productivity: null, health: null, lifestyle: null, consistency: null, balance: null, life: null }
          }
          trend={trendResult.data ?? []}
        />
      )}
    </div>
  );
}
