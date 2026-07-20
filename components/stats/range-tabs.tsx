import Link from "next/link";

import { cn } from "@/lib/utils";
import type { StatsRange } from "@/lib/stats/bucket-range";

const RANGES: { value: StatsRange; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

export function RangeTabs({ active }: { active: StatsRange }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border p-1">
      {RANGES.map((r) => (
        <Link
          key={r.value}
          href={`/stats?range=${r.value}`}
          className={cn(
            "rounded-full px-3 py-1 text-sm transition-colors",
            active === r.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {r.label}
        </Link>
      ))}
    </div>
  );
}
