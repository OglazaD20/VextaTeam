import { NextResponse } from "next/server";
import { z } from "zod";

import { haversineDistanceKm } from "@/lib/activities/distance";
import { searchNearbyEvents } from "@/lib/activities/ticketmaster-client";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  location: z.object({ lat: z.number(), lng: z.number() }),
  maxDistanceKm: z.number().positive().max(200),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const events = await searchNearbyEvents(parsed.data.location, parsed.data.maxDistanceKm);
    const withDistance = events
      .map((event) => ({
        ...event,
        distanceKm: haversineDistanceKm(parsed.data.location, event.location),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return NextResponse.json({ data: withDistance });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Event search failed" },
      { status: 502 },
    );
  }
}
