import type { Metadata } from "next";

import { getAchievementsOverview } from "@/app/(app)/achievements/actions";
import { AchievementsClient } from "@/components/achievements/achievements-client";

export const metadata: Metadata = { title: "Achievements — LifeFlow" };

export default async function AchievementsPage() {
  const result = await getAchievementsOverview();

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Achievements</h1>
        <p className="text-sm text-muted-foreground">Level up by using LifeFlow — every module earns XP.</p>
      </div>

      {result.error ? (
        <p className="text-sm text-destructive">{result.error}</p>
      ) : (
        <AchievementsClient overview={result.data!} />
      )}
    </div>
  );
}
