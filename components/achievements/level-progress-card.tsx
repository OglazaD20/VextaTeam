import { CoinsIcon, StarIcon } from "lucide-react";

import type { UserProgressSummary } from "@/lib/gamification/engine";

export function LevelProgressCard({ progress }: { progress: UserProgressSummary }) {
  const { levelProgress, coins, unlockedCount, totalCount } = progress;

  return (
    <div className="glass-surface flex flex-col gap-4 rounded-2xl border border-border p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
            {levelProgress.level}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Level</p>
            <p className="text-lg font-semibold tracking-tight">{levelProgress.level}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm">
            <StarIcon className="size-4 text-primary" />
            <span className="font-medium">{levelProgress.xpIntoLevel.toLocaleString()}</span>
            <span className="text-muted-foreground">/ {levelProgress.xpForNextLevel.toLocaleString()} XP</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <CoinsIcon className="size-4 text-amber-500" />
            <span className="font-medium">{coins.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${levelProgress.pctToNextLevel}%` }}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {unlockedCount} of {totalCount} achievements unlocked
      </p>
    </div>
  );
}
