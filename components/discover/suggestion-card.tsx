"use client";

import { useTransition } from "react";
import { ClockIcon, MapPinIcon, NavigationIcon, PlusIcon, Share2Icon, SparklesIcon, StarIcon } from "lucide-react";
import { toast } from "sonner";

import { addSuggestionToSchedule, saveActivity } from "@/app/(app)/discover/actions";
import { MapPreview } from "@/components/discover/map-preview";
import { ScheduleSuggestionDialog } from "@/components/discover/schedule-suggestion-dialog";
import { ACTIVITY_CATEGORY_ICON, ACTIVITY_CATEGORY_LABEL } from "@/lib/activities/category-style";
import { shareOrCopy } from "@/lib/activities/share";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ActivitySuggestion } from "@/lib/activities/discover";

const COST_LABEL: Record<ActivitySuggestion["costTier"], string> = {
  free: "Free",
  low: "$",
  medium: "$$",
  high: "$$$",
};

export function SuggestionCard({
  suggestion,
  onGenerateSimilar,
}: {
  suggestion: ActivitySuggestion;
  onGenerateSimilar: (suggestion: ActivitySuggestion) => void;
}) {
  const [isAdding, startAdding] = useTransition();
  const [isSaving, startSaving] = useTransition();

  function handleAdd() {
    startAdding(async () => {
      const result = await addSuggestionToSchedule({
        title: suggestion.title,
        pitch: suggestion.pitch,
        placeName: suggestion.placeName,
        address: suggestion.address,
        estimatedDurationMinutes: suggestion.estimatedDurationMinutes,
        whenIso: null,
      });
      if (result.error) {
        toast.error("Couldn't add that to your schedule", { description: result.error });
      } else {
        toast.success("Added to your unscheduled tasks");
      }
    });
  }

  async function handleScheduleConfirm(whenIso: string) {
    return addSuggestionToSchedule({
      title: suggestion.title,
      pitch: suggestion.pitch,
      placeName: suggestion.placeName,
      address: suggestion.address,
      estimatedDurationMinutes: suggestion.estimatedDurationMinutes,
      whenIso,
    });
  }

  function handleSave() {
    startSaving(async () => {
      const result = await saveActivity({
        kind: "place",
        title: suggestion.title,
        subtitle: suggestion.placeName,
        lat: suggestion.location.lat,
        lng: suggestion.location.lng,
        data: suggestion as unknown as Record<string, unknown>,
      });
      if (result.error) {
        toast.error("Couldn't save that", { description: result.error });
      } else {
        toast.success("Saved for later");
      }
    });
  }

  async function handleShare() {
    const result = await shareOrCopy({
      title: suggestion.title,
      text: `${suggestion.title} — ${suggestion.pitch} (${suggestion.placeName})`,
    });
    if (result === "copied") toast.success("Copied to clipboard");
    if (result === "failed") toast.error("Couldn't share that");
  }

  return (
    <div className="glass-surface flex flex-col gap-3 rounded-2xl border border-border p-4 shadow-sm">
      <MapPreview
        lat={suggestion.location.lat}
        lng={suggestion.location.lng}
        alt={suggestion.placeName}
      />
      <div>
        <div className="flex items-center gap-1.5">
          <span>{ACTIVITY_CATEGORY_ICON[suggestion.category]}</span>
          <p className="font-medium">{suggestion.title}</p>
        </div>
        <p className="text-sm text-muted-foreground">{suggestion.pitch}</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPinIcon className="size-3" />
          {suggestion.placeName} · {suggestion.distanceKm}km
        </span>
        <span className="flex items-center gap-1">
          <NavigationIcon className="size-3" />
          {suggestion.travelMinutes} min {suggestion.travelMode}
        </span>
        <span className="flex items-center gap-1">
          <ClockIcon className="size-3" />
          ~{suggestion.estimatedDurationMinutes} min
        </span>
      </div>

      {suggestion.openingHours && (
        <p className="text-xs text-muted-foreground">Hours: {suggestion.openingHours}</p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="text-[10px]">
          {COST_LABEL[suggestion.costTier]}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          {suggestion.indoorOutdoor === "indoor" ? "Indoor" : "Outdoor"}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          {ACTIVITY_CATEGORY_LABEL[suggestion.category]}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="sm" variant="outline" onClick={handleAdd} disabled={isAdding}>
          <PlusIcon className="size-3.5" /> Add to today
        </Button>
        <ScheduleSuggestionDialog title={suggestion.title} onConfirm={handleScheduleConfirm} />
        <Button size="sm" variant="ghost" onClick={handleSave} disabled={isSaving}>
          <StarIcon className="size-3.5" /> Save
        </Button>
        <Button size="sm" variant="ghost" onClick={handleShare}>
          <Share2Icon className="size-3.5" /> Share
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onGenerateSimilar(suggestion)}>
          <SparklesIcon className="size-3.5" /> More like this
        </Button>
      </div>
    </div>
  );
}
