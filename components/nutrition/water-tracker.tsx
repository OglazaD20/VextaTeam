"use client";

import { useTransition } from "react";
import { DropletIcon } from "lucide-react";
import { toast } from "sonner";

import { logWater } from "@/app/(app)/nutrition/actions";
import { Button } from "@/components/ui/button";

const QUICK_AMOUNTS = [200, 330, 500];

export function WaterTracker({ totalMl, goalMl }: { totalMl: number; goalMl: number }) {
  const [isPending, startTransition] = useTransition();
  const pct = goalMl > 0 ? Math.min(100, Math.round((totalMl / goalMl) * 100)) : 0;

  function handleAdd(amountMl: number) {
    const formData = new FormData();
    formData.set("amountMl", String(amountMl));
    startTransition(async () => {
      const result = await logWater(formData);
      if (result.error) {
        toast.error("Couldn't log water", { description: result.error });
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm">
          <DropletIcon className="size-4" style={{ color: "var(--water)" }} />
          <span className="font-medium">{totalMl} ml</span>
          <span className="text-muted-foreground">/ {goalMl} ml</span>
        </div>
        <span className="text-xs text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: "var(--water)" }}
        />
      </div>
      <div className="flex gap-2">
        {QUICK_AMOUNTS.map((amount) => (
          <Button
            key={amount}
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => handleAdd(amount)}
          >
            +{amount}ml
          </Button>
        ))}
      </div>
    </div>
  );
}
