import { CoinsIcon, LockIcon, StarIcon } from "lucide-react";

import type { AchievementWithStatus } from "@/app/(app)/achievements/actions";
import { Badge } from "@/components/ui/badge";
import { ACHIEVEMENT_TIER_COLOR, ACHIEVEMENT_TIER_LABEL } from "@/lib/gamification/category-style";
import { cn } from "@/lib/utils";

export function AchievementCard({ achievement, isNew }: { achievement: AchievementWithStatus; isNew?: boolean }) {
  const { unlocked, hidden } = achievement;
  const isMystery = hidden && !unlocked;
  const tierColor = ACHIEVEMENT_TIER_COLOR[achievement.tier];

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border p-3 transition-opacity",
        unlocked ? "border-border bg-card" : "border-dashed border-border/70 bg-card/40 opacity-70",
        isNew && "ring-2 ring-primary",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-sm"
            style={{ backgroundColor: `${tierColor}26`, color: tierColor }}
          >
            {unlocked ? <StarIcon className="size-4" /> : <LockIcon className="size-3.5" />}
          </div>
          <div>
            <p className="text-sm font-medium leading-tight">{isMystery ? "Secret achievement" : achievement.title}</p>
            <div className="mt-1 flex items-center gap-1">
              <Badge variant="outline" className="text-[10px]" style={{ borderColor: tierColor, color: tierColor }}>
                {ACHIEVEMENT_TIER_LABEL[achievement.tier]}
              </Badge>
              {isNew && (
                <Badge className="bg-primary text-[10px] text-primary-foreground" variant="default">
                  New
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{isMystery ? "Keep using LifeFlow to reveal this one." : achievement.description}</p>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <StarIcon className="size-3" /> {achievement.xp} XP
        </span>
        <span className="flex items-center gap-1">
          <CoinsIcon className="size-3" /> {achievement.coins}
        </span>
      </div>
    </div>
  );
}
