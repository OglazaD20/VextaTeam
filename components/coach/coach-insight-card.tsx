import { COACHING_CATEGORY_COLOR, COACHING_CATEGORY_ICON } from "@/lib/coach/category-style";
import type { CoachingCategory } from "@/lib/ai/generate-coaching";

export interface CoachInsight {
  title: string;
  detail: string;
  category: CoachingCategory;
}

export function CoachInsightCard({ insight }: { insight: CoachInsight }) {
  const Icon = COACHING_CATEGORY_ICON[insight.category];
  const color = COACHING_CATEGORY_COLOR[insight.category];

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${color}26`, color }}
        >
          <Icon className="size-3.5" />
        </span>
        <p className="text-sm font-medium">{insight.title}</p>
      </div>
      <p className="text-xs text-muted-foreground">{insight.detail}</p>
    </div>
  );
}
