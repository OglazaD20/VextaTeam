import type { Metadata } from "next";

import { getRewardsOverview } from "@/app/(app)/rewards/actions";
import { RewardsClient } from "@/components/rewards/rewards-client";

export const metadata: Metadata = { title: "Rewards — LifeFlow" };

export default async function RewardsPage() {
  const result = await getRewardsOverview();

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Rewards</h1>
        <p className="text-sm text-muted-foreground">
          Cosmetic unlocks earned by hitting achievements — equip an accent theme, an avatar frame, and a celebration effect.
        </p>
      </div>

      {result.error ? <p className="text-sm text-destructive">{result.error}</p> : <RewardsClient overview={result.data!} />}
    </div>
  );
}
