"use client";

import type { RewardWithStatus } from "@/app/(app)/achievements/actions";
import { RewardCard } from "@/components/achievements/reward-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RewardCategory } from "@/lib/rewards/rewards";

const CATEGORY_LABEL: Record<RewardCategory, string> = {
  theme: "Accent themes",
  frame: "Avatar frames",
  effect: "Celebration effects",
};

export function CollectionSection({ collection }: { collection: Record<RewardCategory, RewardWithStatus[]> }) {
  return (
    <Tabs defaultValue="theme">
      <TabsList>
        {(Object.keys(CATEGORY_LABEL) as RewardCategory[]).map((cat) => (
          <TabsTrigger key={cat} value={cat}>
            {CATEGORY_LABEL[cat]}
          </TabsTrigger>
        ))}
      </TabsList>

      {(Object.keys(CATEGORY_LABEL) as RewardCategory[]).map((cat) => (
        <TabsContent key={cat} value={cat} className="pt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {collection[cat].map((reward) => (
              <RewardCard key={reward.id} reward={reward} />
            ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
