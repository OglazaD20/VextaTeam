import {
  BrainIcon,
  HeartPulseIcon,
  ListChecksIcon,
  TargetIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";

const CATEGORY_ICON: Record<Tables<"ai_predictions">["category"], LucideIcon> = {
  goal: TargetIcon,
  health: HeartPulseIcon,
  habit: ListChecksIcon,
  finance: WalletIcon,
  productivity: BrainIcon,
};

const CATEGORY_LABEL: Record<Tables<"ai_predictions">["category"], string> = {
  goal: "Goal",
  health: "Health",
  habit: "Habit",
  finance: "Finance",
  productivity: "Productivity",
};

function confidenceTone(pct: number): string {
  if (pct >= 75) return "text-success";
  if (pct >= 50) return "text-warning";
  return "text-muted-foreground";
}

export function PredictionCard({ prediction }: { prediction: Tables<"ai_predictions"> }) {
  const Icon = CATEGORY_ICON[prediction.category];

  return (
    <div className="glass-surface flex flex-col gap-3 rounded-2xl border border-border p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="size-4" />
          </div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {CATEGORY_LABEL[prediction.category]}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className={cn("text-lg font-semibold tabular-nums", confidenceTone(prediction.confidence_pct))}>
            {prediction.confidence_pct}%
          </span>
          <span className="text-[10px] text-muted-foreground">confidence</span>
        </div>
      </div>

      <p className="font-medium">{prediction.prediction}</p>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            prediction.confidence_pct >= 75
              ? "bg-success"
              : prediction.confidence_pct >= 50
                ? "bg-warning"
                : "bg-muted-foreground",
          )}
          style={{ width: `${prediction.confidence_pct}%` }}
        />
      </div>

      <p className="text-sm text-muted-foreground">{prediction.reasoning}</p>

      <div className="rounded-xl bg-accent/50 px-3 py-2 text-sm">
        <span className="font-medium">Suggestion: </span>
        {prediction.recommendation}
      </div>
    </div>
  );
}
