"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarPlusIcon, CheckIcon, Loader2Icon, MapPinIcon, UtensilsIcon, LandmarkIcon, SparkleIcon } from "lucide-react";
import { toast } from "sonner";

import { addItineraryItemToCalendar } from "@/app/(app)/travel/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/types/database";

const TYPE_ICON: Record<Tables<"trip_itinerary_items">["type"], React.ElementType> = {
  attraction: LandmarkIcon,
  restaurant: UtensilsIcon,
  activity: SparkleIcon,
  transport: MapPinIcon,
  hotel: MapPinIcon,
  free_time: SparkleIcon,
};

function ItineraryItemRow({ item, currency }: { item: Tables<"trip_itinerary_items">; currency: string }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const Icon = TYPE_ICON[item.type];

  function handleAddToCalendar() {
    startTransition(async () => {
      const result = await addItineraryItemToCalendar(item.id);
      if (result.error) {
        toast.error("Couldn't add to calendar", { description: result.error });
        return;
      }
      toast.success("Added to calendar");
      router.refresh();
    });
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border p-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium">{item.title}</p>
          {item.start_time && (
            <span className="shrink-0 text-xs text-muted-foreground">{item.start_time.slice(0, 5)}</span>
          )}
        </div>
        {item.place_name && <p className="text-sm text-muted-foreground">{item.place_name}</p>}
        {item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {item.estimated_cost !== null && (
            <Badge variant="outline" className="text-[10px]">
              {item.estimated_cost === 0 ? "Free" : `~${item.estimated_cost} ${currency}`}
            </Badge>
          )}
          {item.estimated_duration_minutes && (
            <Badge variant="outline" className="text-[10px]">
              ~{item.estimated_duration_minutes} min
            </Badge>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant={item.added_to_calendar ? "ghost" : "outline"}
        disabled={isPending || item.added_to_calendar}
        onClick={handleAddToCalendar}
        className="shrink-0"
      >
        {isPending ? (
          <Loader2Icon className="animate-spin" />
        ) : item.added_to_calendar ? (
          <CheckIcon className="text-success" />
        ) : (
          <CalendarPlusIcon />
        )}
        {item.added_to_calendar ? "Added" : "Add to calendar"}
      </Button>
    </div>
  );
}

export function ItineraryDay({
  dayNumber,
  date,
  items,
  currency,
}: {
  dayNumber: number;
  date: string;
  items: Tables<"trip_itinerary_items">[];
  currency: string;
}) {
  const label = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" }).format(
    new Date(`${date}T00:00:00`),
  );

  return (
    <div className="flex flex-col gap-2.5">
      <h3 className="text-sm font-semibold">
        Day {dayNumber} <span className="font-normal text-muted-foreground">· {label}</span>
      </h3>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <ItineraryItemRow key={item.id} item={item} currency={currency} />
        ))}
      </div>
    </div>
  );
}
