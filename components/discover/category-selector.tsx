"use client";

import { ACTIVITY_CATEGORY_ICON, ACTIVITY_CATEGORY_LABEL } from "@/lib/activities/category-style";
import type { ActivityCategory } from "@/lib/activities/geoapify-client";
import { cn } from "@/lib/utils";

const ALL_CATEGORIES = Object.keys(ACTIVITY_CATEGORY_LABEL) as ActivityCategory[];

function CategoryChip({
  icon,
  label,
  isSelected,
  onClick,
}: {
  icon: string;
  label: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
        isSelected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:border-primary hover:text-foreground",
      )}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}

export function CategorySelector({
  selected,
  onChange,
  includeEvents,
  onToggleEvents,
  eventsAvailable,
}: {
  selected: ActivityCategory[];
  onChange: (next: ActivityCategory[]) => void;
  includeEvents: boolean;
  onToggleEvents: () => void;
  eventsAvailable: boolean;
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
      {ALL_CATEGORIES.map((category) => (
        <CategoryChip
          key={category}
          icon={ACTIVITY_CATEGORY_ICON[category]}
          label={ACTIVITY_CATEGORY_LABEL[category]}
          isSelected={selected.includes(category)}
          onClick={() => toggle(category)}
        />
      ))}
      {eventsAvailable && (
        <CategoryChip
          icon="🎟️"
          label="Live events"
          isSelected={includeEvents}
          onClick={onToggleEvents}
        />
      )}
    </div>
  );
}
