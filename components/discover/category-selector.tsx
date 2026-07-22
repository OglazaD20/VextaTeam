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
      aria-pressed={isSelected}
      className={cn(
        "flex items-center gap-2 rounded-full border py-1.5 pr-3.5 pl-1.5 text-sm font-medium",
        "transition-all duration-200 ease-out active:scale-[0.97]",
        isSelected
          ? "border-transparent bg-primary text-primary-foreground shadow-sm shadow-primary/25"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-accent hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full text-[13px] transition-colors",
          isSelected ? "bg-primary-foreground/15" : "bg-muted",
        )}
      >
        {icon}
      </span>
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
