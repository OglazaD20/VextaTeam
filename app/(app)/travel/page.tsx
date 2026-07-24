import type { Metadata } from "next";
import Link from "next/link";
import { MapPinIcon, PlaneIcon } from "lucide-react";

import { CreateTripDialog } from "@/components/travel/create-trip-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Travel — LifeFlow" };

function formatDateRange(start: string, end: string): string {
  const formatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
  return `${formatter.format(new Date(`${start}T00:00:00`))} – ${formatter.format(new Date(`${end}T00:00:00`))}`;
}

export default async function TravelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: trips } = await supabase
    .from("trips")
    .select("*")
    .eq("user_id", user.id)
    .order("start_date", { ascending: true });

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Travel</h1>
          <p className="text-sm text-muted-foreground">AI-planned trips, itineraries, and packing lists.</p>
        </div>
        <CreateTripDialog />
      </div>

      {trips && trips.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {trips.map((trip) => (
            <Link key={trip.id} href={`/travel/${trip.id}`}>
              <Card className="glass-surface h-full transition-colors hover:border-primary/40">
                <CardContent className="flex flex-col gap-2 pt-6">
                  <div className="flex items-center gap-2">
                    <PlaneIcon className="size-4 text-primary" />
                    <p className="font-medium">{trip.title}</p>
                  </div>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPinIcon className="size-3.5" /> {trip.destination}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateRange(trip.start_date, trip.end_date)}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <PlaneIcon className="size-8 text-muted-foreground" />
          <div>
            <p className="font-medium">No trips yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Create a trip and let AI build a day-by-day itinerary, packing list, and cost estimates.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
