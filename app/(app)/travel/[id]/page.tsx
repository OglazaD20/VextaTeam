import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { addDays, format } from "date-fns";
import { CloudSunIcon, LuggageIcon, MapPinIcon } from "lucide-react";

import { DeleteTripButton } from "@/components/travel/delete-trip-button";
import { GenerateItineraryButton } from "@/components/travel/generate-itinerary-button";
import { ItineraryDay } from "@/components/travel/itinerary-day";
import { PackingList } from "@/components/travel/packing-list";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Trip — LifeFlow" };

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: trip } = await supabase.from("trips").select("*").eq("id", id).eq("user_id", user.id).single();
  if (!trip) notFound();

  const [{ data: itineraryItems }, { data: packingItems }] = await Promise.all([
    supabase
      .from("trip_itinerary_items")
      .select("*")
      .eq("trip_id", id)
      .order("day_number", { ascending: true })
      .order("sort_order", { ascending: true }),
    supabase.from("trip_packing_items").select("*").eq("trip_id", id).order("sort_order", { ascending: true }),
  ]);

  const itemsByDay = new Map<number, typeof itineraryItems>();
  for (const item of itineraryItems ?? []) {
    const list = itemsByDay.get(item.day_number) ?? [];
    list.push(item);
    itemsByDay.set(item.day_number, list);
  }
  const days = [...itemsByDay.keys()].sort((a, b) => a - b);
  const totalEstimatedCost = (itineraryItems ?? []).reduce((sum, i) => sum + (i.estimated_cost ?? 0), 0);

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{trip.title}</h1>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPinIcon className="size-3.5" /> {trip.destination} ·{" "}
            {format(new Date(`${trip.start_date}T00:00:00`), "MMM d")} –{" "}
            {format(new Date(`${trip.end_date}T00:00:00`), "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GenerateItineraryButton tripId={trip.id} hasItinerary={days.length > 0} />
          <DeleteTripButton tripId={trip.id} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {trip.budget !== null && (
          <Badge variant="outline">
            Budget: {trip.budget} {trip.currency}
          </Badge>
        )}
        {days.length > 0 && (
          <Badge variant="outline">
            Estimated: {Math.round(totalEstimatedCost)} {trip.currency}
          </Badge>
        )}
        {trip.transportation && <Badge variant="outline" className="capitalize">{trip.transportation}</Badge>}
      </div>

      {trip.weather_summary && (
        <Card className="glass-surface">
          <CardContent className="flex items-start gap-2.5 pt-6 text-sm">
            <CloudSunIcon className="mt-0.5 size-4 shrink-0 text-primary" />
            <div>
              <p>{trip.weather_summary}</p>
              {trip.packing_notes && <p className="pt-1 text-muted-foreground">{trip.packing_notes}</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {days.length > 0 ? (
        <div className="flex flex-col gap-5">
          {days.map((dayNumber) => (
            <ItineraryDay
              key={dayNumber}
              dayNumber={dayNumber}
              date={format(addDays(new Date(`${trip.start_date}T00:00:00`), dayNumber - 1), "yyyy-MM-dd")}
              items={itemsByDay.get(dayNumber) ?? []}
              currency={trip.currency}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No itinerary yet — generate one to get a day-by-day plan with real nearby places.
          </p>
        </div>
      )}

      <Card className="glass-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LuggageIcon className="size-4" /> Packing list
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PackingList tripId={trip.id} items={packingItems ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
