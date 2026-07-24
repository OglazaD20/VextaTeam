"use client";

import * as React from "react";

import type { AchievementsOverview } from "@/app/(app)/achievements/actions";
import { AchievementCard } from "@/components/achievements/achievement-card";
import { CollectionSection } from "@/components/achievements/collection-section";
import { LevelProgressCard } from "@/components/achievements/level-progress-card";
import { ConfettiBurst } from "@/components/shared/confetti-burst";
import { Badge } from "@/components/ui/badge";
import { ACHIEVEMENT_CATEGORY_ICON, ACHIEVEMENT_CATEGORY_LABEL } from "@/lib/gamification/category-style";
import type { AchievementCategory } from "@/lib/gamification/achievements";

const CATEGORY_ORDER: AchievementCategory[] = [
  "tasks",
  "habits",
  "streak",
  "goals",
  "mood",
  "nutrition",
  "health",
  "finance",
  "discover",
  "focus",
  "memory",
  "ai",
  "level",
  "secret",
];

export function AchievementsClient({ overview }: { overview: AchievementsOverview }) {
  const { progress, byCategory, recentUnlocks, newlyUnlocked, confettiEnabled, collection } = overview;
  const newIds = React.useMemo(() => new Set(newlyUnlocked.map((a) => a.id)), [newlyUnlocked]);
  const [fireConfetti] = React.useState(() => confettiEnabled && newlyUnlocked.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <ConfettiBurst fire={fireConfetti} />
      <LevelProgressCard progress={progress} />

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Your collection</h2>
        <CollectionSection collection={collection} />
      </div>

      {recentUnlocks.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Recently unlocked</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {recentUnlocks.map((a) => (
              <AchievementCard key={a.id} achievement={a} isNew={newIds.has(a.id)} />
            ))}
          </div>
        </div>
      )}

      {CATEGORY_ORDER.filter((cat) => (byCategory[cat]?.length ?? 0) > 0).map((cat) => {
        const items = byCategory[cat]!;
        const unlockedCount = items.filter((a) => a.unlocked).length;
        return (
          <div key={cat} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span>{ACHIEVEMENT_CATEGORY_ICON[cat]}</span>
              <h2 className="text-sm font-medium">{ACHIEVEMENT_CATEGORY_LABEL[cat]}</h2>
              <Badge variant="outline" className="text-[10px]">
                {unlockedCount}/{items.length}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {items.map((a) => (
                <AchievementCard key={a.id} achievement={a} isNew={newIds.has(a.id)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
