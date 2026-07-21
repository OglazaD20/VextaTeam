"use client";

import { ACTIVITY_CATEGORY_ICON, ACTIVITY_CATEGORY_LABEL } from "@/lib/activities/category-style";
import type { ActivityCategory } from "@/lib/activities/geoapify-client";
import { cn } from "@/lib/utils";

const ALL_CATEGORIES = Object.keys(ACTIVITY_CATEGORY_LABEL) as ActivityCategory[];

export function CategorySelector({
  selected,
  onChange,
}: {
  selected: ActivityCategory[];
  onChange: (next: ActivityCategory[]) => void;
}) {
  function toggle(category: ActivityCategory) {
    if (selected.includes(category)) {
      onChange(selected.filter((c) => c !== category));
    } else {
      onChange([...selected, category]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {ALL_CATEGORIES.map((category) => {
        const isSelected = selected.includes(category);
        return (
          <button
            key={category}
            type="button"
            onClick={() => toggle(category)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
              isSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary hover:text-foreground",
            )}
          >
            <span>{ACTIVITY_CATEGORY_ICON[category]}</span>
            {ACTIVITY_CATEGORY_LABEL[category]}
          </button>
        );
      })}
    </div>
  );
}
