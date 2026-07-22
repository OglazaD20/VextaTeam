import type { LucideIcon } from "lucide-react";
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function HealthMetricCard({
  icon: Icon,
  label,
  value,
  unit,
  sevenDayAverage,
  action,
}: {
  icon: LucideIcon;
  label: string;
  value: number | null;
  unit: string;
  /** Comparison point for the delta indicator — omit to hide it. */
  sevenDayAverage?: number | null;
  action?: React.ReactNode;
}) {
  const delta =
    value !== null && sevenDayAverage !== null && sevenDayAverage !== undefined && sevenDayAverage > 0
      ? Math.round(((value - sevenDayAverage) / sevenDayAverage) * 100)
      : null;

  return (
    <Card className="gap-2 py-4">
      <CardContent className="flex flex-col gap-2 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon className="size-3.5" />
            {label}
          </div>
          {action}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-semibold tracking-tight">{value !== null ? value : "—"}</span>
          {value !== null && <span className="text-xs text-muted-foreground">{unit}</span>}
        </div>
        {delta !== null && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs",
              delta >= 0 ? "text-success" : "text-muted-foreground",
            )}
          >
            {delta >= 0 ? <TrendingUpIcon className="size-3" /> : <TrendingDownIcon className="size-3" />}
            {Math.abs(delta)}% vs 7-day avg
          </div>
        )}
      </CardContent>
    </Card>
  );
}
