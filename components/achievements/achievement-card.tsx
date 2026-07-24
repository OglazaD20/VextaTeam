"use client";

import * as React from "react";
import { CalendarIcon, CheckIcon, CoinsIcon, LockIcon, StarIcon } from "lucide-react";
import { toast } from "sonner";

import { equipReward, type AchievementWithStatus } from "@/app/(app)/achievements/actions";
import { RewardSwatch } from "@/components/achievements/reward-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ACHIEVEMENT_TIER_COLOR, ACHIEVEMENT_TIER_LABEL } from "@/lib/gamification/category-style";
import { cn } from "@/lib/utils";

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export function AchievementCard({ achievement, isNew }: { achievement: AchievementWithStatus; isNew?: boolean }) {
  const { unlocked, hidden } = achievement;
  const isMystery = hidden && !unlocked;
  const tierColor = ACHIEVEMENT_TIER_COLOR[achievement.tier];
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const pct = Math.min(100, Math.round((achievement.currentValue / achievement.target) * 100));

  function handleEquip() {
    if (!achievement.reward) return;
    startTransition(async () => {
      const result = await equipReward(achievement.reward!.id);
      if (result.error) toast.error("Couldn't equip that", { description: result.error });
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex flex-col gap-2 rounded-xl border p-3 text-left transition-opacity hover:border-primary/40",
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
          {achievement.reward && !isMystery && <RewardSwatch reward={achievement.reward} />}
        </div>

        <p className="text-xs text-muted-foreground">{isMystery ? "Keep using LifeFlow to reveal this one." : achievement.description}</p>

        {!unlocked && !isMystery && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <StarIcon className="size-3" /> {achievement.xp} XP
          </span>
          <span className="flex items-center gap-1">
            <CoinsIcon className="size-3" /> {achievement.coins}
          </span>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div
                className="flex size-12 shrink-0 items-center justify-center rounded-full text-lg"
                style={{ backgroundColor: `${tierColor}26`, color: tierColor }}
              >
                {unlocked ? <StarIcon className="size-5" /> : <LockIcon className="size-5" />}
              </div>
              <div>
                <DialogTitle>{isMystery ? "Secret achievement" : achievement.title}</DialogTitle>
                <Badge variant="outline" className="mt-1 text-[10px]" style={{ borderColor: tierColor, color: tierColor }}>
                  {ACHIEVEMENT_TIER_LABEL[achievement.tier]} rarity
                </Badge>
              </div>
            </div>
            <DialogDescription>
              {isMystery ? "Keep using LifeFlow to reveal this one." : achievement.description}
            </DialogDescription>
          </DialogHeader>

          {!isMystery && (
            <div className="flex flex-col gap-4">
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>
                    {Math.min(achievement.currentValue, achievement.target).toLocaleString()} / {achievement.target.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full transition-all", unlocked ? "bg-primary" : "bg-primary/70")}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <StarIcon className="size-4 text-primary" />
                  <span className="font-medium">{achievement.xp} XP</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CoinsIcon className="size-4 text-amber-500" />
                  <span className="font-medium">{achievement.coins} coins</span>
                </div>
                {unlocked ? (
                  <Badge className="gap-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" variant="secondary">
                    <CheckIcon className="size-3" /> Unlocked
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-muted-foreground">
                    <LockIcon className="size-3" /> Locked
                  </Badge>
                )}
              </div>

              {unlocked && achievement.unlockedAt && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarIcon className="size-3.5" /> Completed {formatDate(achievement.unlockedAt)}
                </p>
              )}

              {achievement.reward && (
                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <RewardSwatch reward={achievement.reward} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{achievement.reward.title}</p>
                    <p className="text-xs text-muted-foreground">{achievement.reward.description}</p>
                  </div>
                  {achievement.reward.owned && !achievement.reward.equipped && (
                    <Button size="sm" variant="outline" onClick={handleEquip} disabled={isPending}>
                      Equip
                    </Button>
                  )}
                  {achievement.reward.equipped && (
                    <Badge variant="secondary" className="gap-1">
                      <CheckIcon className="size-3" /> Equipped
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
