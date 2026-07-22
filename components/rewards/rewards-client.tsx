"use client";

import type { RewardsOverview } from "@/app/(app)/rewards/actions";
import { RewardCard } from "@/components/rewards/reward-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CATEGORY_LABEL = { theme: "Accent themes", frame: "Avatar frames", effect: "Celebration effects" } as const;

export function RewardsClient({ overview }: { overview: RewardsOverview }) {
  const { byCategory } = overview;

  return (
    <Tabs defaultValue="theme">
      <TabsList>
        {(Object.keys(CATEGORY_LABEL) as (keyof typeof CATEGORY_LABEL)[]).map((cat) => (
          <TabsTrigger key={cat} value={cat}>
            {CATEGORY_LABEL[cat]}
          </TabsTrigger>
        ))}
      </TabsList>

      {(Object.keys(CATEGORY_LABEL) as (keyof typeof CATEGORY_LABEL)[]).map((cat) => (
        <TabsContent key={cat} value={cat} className="pt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {byCategory[cat].map((reward) => (
              <RewardCard key={reward.id} reward={reward} />
            ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
