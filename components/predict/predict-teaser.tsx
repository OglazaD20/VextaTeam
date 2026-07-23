import { TrendingUpIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";

export function PredictTeaser({ predictions }: { predictions: Tables<"ai_predictions">[] }) {
  if (predictions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Generate predictions from your goals, habits, and health data to see what&apos;s likely ahead.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {predictions.slice(0, 2).map((prediction) => (
        <div key={prediction.id} className="flex items-start gap-2">
          <TrendingUpIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <p className="text-sm">
            {prediction.prediction}{" "}
            <span
              className={cn(
                "text-xs font-medium tabular-nums",
                prediction.confidence_pct >= 75 ? "text-success" : "text-muted-foreground",
              )}
            >
              ({prediction.confidence_pct}%)
            </span>
          </p>
        </div>
      ))}
    </div>
  );
}
