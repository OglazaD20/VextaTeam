"use client";

import { useTransition } from "react";
import { ClockIcon, MapPinIcon, NavigationIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { addSuggestionToSchedule } from "@/app/(app)/discover/actions";
import { MapPreview } from "@/components/discover/map-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ActivitySuggestion } from "@/lib/activities/discover";

const COST_LABEL: Record<ActivitySuggestion["costTier"], string> = {
  free: "Free",
  low: "$",
  medium: "$$",
  high: "$$$",
};

export function SuggestionCard({ suggestion }: { suggestion: ActivitySuggestion }) {
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
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

  return (
    <div className="glass-surface flex flex-col gap-3 rounded-2xl border border-border p-4 shadow-sm">
      <MapPreview
        lat={suggestion.location.lat}
        lng={suggestion.location.lng}
        alt={suggestion.placeName}
      />
      <div>
        <p className="font-medium">{suggestion.title}</p>
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

      <div className="flex items-center gap-1.5">
        <Badge variant="outline" className="text-[10px]">
          {COST_LABEL[suggestion.costTier]}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          {suggestion.indoorOutdoor === "indoor" ? "Indoor" : "Outdoor"}
        </Badge>
      </div>

      <Button size="sm" variant="outline" onClick={handleAdd} disabled={isPending}>
        <PlusIcon className="size-3.5" /> Add to today&apos;s schedule
      </Button>
    </div>
  );
}
