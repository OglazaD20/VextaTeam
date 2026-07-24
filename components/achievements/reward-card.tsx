"use client";

import * as React from "react";
import { CheckIcon, LockIcon } from "lucide-react";
import { toast } from "sonner";

import { equipReward, type RewardWithStatus } from "@/app/(app)/achievements/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RewardSwatch({ reward }: { reward: RewardWithStatus }) {
  if (reward.category === "theme" && reward.theme) {
    return <span className="size-8 rounded-full border border-border" style={{ background: reward.theme.swatch }} />;
  }
  if (reward.category === "frame" && reward.frame) {
    return (
      <span
        className={cn("flex size-8 items-center justify-center rounded-full", reward.frame.legendary && "reward-frame-legendary")}
        style={!reward.frame.legendary ? { boxShadow: `0 0 0 3px ${reward.frame.swatch}` } : undefined}
      >
        <span className="size-4 rounded-full bg-muted" />
      </span>
    );
  }
  return <span className="flex size-8 items-center justify-center rounded-full bg-muted text-base">🎉</span>;
}

export function RewardCard({ reward }: { reward: RewardWithStatus }) {
  const [isPending, startTransition] = React.useTransition();

  function handleEquip() {
    startTransition(async () => {
      const result = await equipReward(reward.id);
      if (result.error) toast.error("Couldn't equip that", { description: result.error });
    });
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-3",
        reward.owned ? "border-border bg-card" : "border-dashed border-border/70 bg-card/40 opacity-70",
      )}
    >
      <div className="flex items-center gap-3">
        <RewardSwatch reward={reward} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{reward.title}</p>
          <p className="text-xs text-muted-foreground">{reward.description}</p>
        </div>
      </div>

      {reward.equipped ? (
        <Button size="sm" variant="secondary" disabled className="gap-1.5">
          <CheckIcon className="size-3.5" /> Equipped
        </Button>
      ) : reward.owned ? (
        <Button size="sm" variant="outline" onClick={handleEquip} disabled={isPending}>
          Equip
        </Button>
      ) : (
        <Button size="sm" variant="outline" disabled className="gap-1.5 text-muted-foreground">
          <LockIcon className="size-3.5" /> Locked
        </Button>
      )}
    </div>
  );
}
