"use client";

import { AccessibilityIcon, FlameIcon, GemIcon, HeartIcon, PawPrintIcon, SparkleIcon, UsersIcon } from "lucide-react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { DiscoverSmartFilters } from "@/lib/activities/discover";

export type PreferenceHint = "familyFriendly" | "petFriendly" | "romantic";

interface ToggleDef {
  key: keyof DiscoverSmartFilters;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

const TOGGLES: ToggleDef[] = [
  { key: "freeOnly", label: "Free" },
  { key: "luxury", label: "Luxury", icon: GemIcon },
  { key: "popular", label: "Popular", icon: FlameIcon },
  { key: "hiddenGems", label: "Hidden gems", icon: SparkleIcon },
  { key: "wheelchairAccessible", label: "Wheelchair accessible", icon: AccessibilityIcon },
  { key: "fastVisit", label: "Fast visit (<1h)" },
  { key: "longActivities", label: "Long activity (2h+)" },
];

const PREFERENCE_TOGGLES: { key: PreferenceHint; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "familyFriendly", label: "Family friendly", icon: UsersIcon },
  { key: "petFriendly", label: "Pet friendly", icon: PawPrintIcon },
  { key: "romantic", label: "Romantic", icon: HeartIcon },
];

function Chip({
  label,
  icon: Icon,
  isSelected,
  onClick,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        isSelected
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {Icon && <Icon className="size-3.5" />}
      {label}
    </button>
  );
}

export function SmartFiltersPanel({
  filters,
  onChange,
  preferenceHints,
  onPreferenceHintsChange,
  maxTravelMinutes,
  onMaxTravelMinutesChange,
}: {
  filters: DiscoverSmartFilters;
  onChange: (next: DiscoverSmartFilters) => void;
  preferenceHints: PreferenceHint[];
  onPreferenceHintsChange: (next: PreferenceHint[]) => void;
  maxTravelMinutes: string;
  onMaxTravelMinutesChange: (value: string) => void;
}) {
  function toggle(key: keyof DiscoverSmartFilters) {
    onChange({ ...filters, [key]: !filters[key] });
  }

  function togglePreference(key: PreferenceHint) {
    onPreferenceHintsChange(
      preferenceHints.includes(key) ? preferenceHints.filter((h) => h !== key) : [...preferenceHints, key],
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {TOGGLES.map((t) => (
          <Chip
            key={t.key}
            label={t.label}
            icon={t.icon}
            isSelected={Boolean(filters[t.key])}
            onClick={() => toggle(t.key)}
          />
        ))}
        {PREFERENCE_TOGGLES.map((t) => (
          <Chip
            key={t.key}
            label={t.label}
            icon={t.icon}
            isSelected={preferenceHints.includes(t.key)}
            onClick={() => togglePreference(t.key)}
          />
        ))}
      </div>

      <div className="flex flex-col gap-1.5 sm:w-40">
        <Label htmlFor="maxTravelMinutes">Max travel time</Label>
        <Select value={maxTravelMinutes} onValueChange={onMaxTravelMinutesChange}>
          <SelectTrigger id="maxTravelMinutes">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Any</SelectItem>
            <SelectItem value="10">10 min</SelectItem>
            <SelectItem value="20">20 min</SelectItem>
            <SelectItem value="30">30 min</SelectItem>
            <SelectItem value="60">60 min</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
