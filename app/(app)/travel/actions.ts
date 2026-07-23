"use server";

import { revalidatePath } from "next/cache";

import { generateTripPlan } from "@/lib/travel/generate-itinerary";
import { getLocale } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import { addPackingItemSchema, createTripSchema, type CreateTripInput } from "./schema";

export interface ActionResult<T = undefined> {
  error?: string;
  data?: T;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  return { supabase, user };
}

function revalidateTravel(tripId?: string) {
  revalidatePath("/travel");
  if (tripId) revalidatePath(`/travel/${tripId}`);
}

export async function createTrip(input: CreateTripInput): Promise<ActionResult<{ id: string }>> {
  const parsed = createTripSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();
  const data = parsed.data;

  const { data: trip, error } = await supabase
    .from("trips")
    .insert({
      user_id: user.id,
      title: data.title,
      destination: data.destination,
      start_date: data.startDate,
      end_date: data.endDate,
      budget: data.budget ?? null,
      currency: data.currency,
      transportation: data.transportation ?? null,
    })
    .select("id")
    .single();

  if (error || !trip) {
    return { error: error?.message ?? "Couldn't create that trip" };
  }

  revalidateTravel();
  return { data: { id: trip.id } };
}

export async function deleteTrip(tripId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("trips").delete().eq("id", tripId).eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidateTravel();
  return {};
}

/** Geocodes the destination, pulls real nearby place candidates, and asks the AI to build the itinerary + packing list from them. */
export async function generateItinerary(tripId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .eq("user_id", user.id)
    .single();

  if (tripError || !trip) {
    return { error: tripError?.message ?? "Trip not found" };
  }

  try {
    const locale = await getLocale();
    const plan = await generateTripPlan(
      {
        destination: trip.destination,
        startDate: trip.start_date,
        endDate: trip.end_date,
        budget: trip.budget,
        currency: trip.currency,
        transportation: trip.transportation,
      },
      locale,
    );

    await supabase.from("trip_itinerary_items").delete().eq("trip_id", tripId);
    await supabase.from("trip_packing_items").delete().eq("trip_id", tripId);

    if (plan.items.length > 0) {
      const { error: itemsError } = await supabase.from("trip_itinerary_items").insert(
        plan.items.map((item, index) => ({
          trip_id: tripId,
          day_number: item.dayNumber,
          start_time: item.startTime,
          title: item.title,
          type: item.type,
          place_name: item.placeName,
          address: item.address,
          lat: item.location?.lat ?? null,
          lng: item.location?.lng ?? null,
          estimated_cost: item.estimatedCost,
          estimated_duration_minutes: item.estimatedDurationMinutes,
          notes: item.notes,
          sort_order: index,
        })),
      );
      if (itemsError) return { error: itemsError.message };
    }

    if (plan.packingList.length > 0) {
      const { error: packingError } = await supabase.from("trip_packing_items").insert(
        plan.packingList.map((item, index) => ({
          trip_id: tripId,
          item: item.item,
          category: item.category,
          sort_order: index,
        })),
      );
      if (packingError) return { error: packingError.message };
    }

    await supabase
      .from("trips")
      .update({
        destination_lat: plan.destinationLocation.lat,
        destination_lng: plan.destinationLocation.lng,
        weather_summary: plan.weatherSummary,
        packing_notes: plan.packingNotes,
        status: "upcoming",
        updated_at: new Date().toISOString(),
      })
      .eq("id", tripId);

    revalidateTravel(tripId);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't generate that itinerary" };
  }
}

export async function togglePackingItem(itemId: string, isPacked: boolean): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const { error } = await supabase.from("trip_packing_items").update({ is_packed: isPacked }).eq("id", itemId);
  if (error) return { error: error.message };

  revalidateTravel();
  return {};
}

export async function addPackingItem(
  tripId: string,
  input: { item: string; category: string },
): Promise<ActionResult> {
  const parsed = addPackingItemSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase } = await requireUser();

  const { error } = await supabase.from("trip_packing_items").insert({
    trip_id: tripId,
    item: parsed.data.item,
    category: parsed.data.category,
  });
  if (error) return { error: error.message };

  revalidateTravel(tripId);
  return {};
}

export async function deletePackingItem(itemId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const { error } = await supabase.from("trip_packing_items").delete().eq("id", itemId);
  if (error) return { error: error.message };

  revalidateTravel();
  return {};
}

/** Adds one itinerary item to the real calendar, computing its actual date from the trip's start date + day offset. */
export async function addItineraryItemToCalendar(itemId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { data: item, error: itemError } = await supabase
    .from("trip_itinerary_items")
    .select("*, trips!inner(id, user_id, start_date, title)")
    .eq("id", itemId)
    .single();

  if (itemError || !item) {
    return { error: itemError?.message ?? "Itinerary item not found" };
  }
  const trip = item.trips as unknown as Tables<"trips">;
  if (trip.user_id !== user.id) return { error: "Not authenticated" };

  const dayDate = new Date(`${trip.start_date}T00:00:00`);
  dayDate.setDate(dayDate.getDate() + (item.day_number - 1));
  const [hours, minutes] = (item.start_time ?? "09:00:00").split(":").map(Number);
  dayDate.setHours(hours, minutes, 0, 0);
  const durationMinutes = item.estimated_duration_minutes ?? 60;
  const scheduledEnd = new Date(dayDate.getTime() + durationMinutes * 60_000);

  const { error: insertError } = await supabase.from("schedule_items").insert({
    user_id: user.id,
    type: "activity",
    title: `${item.title} (${trip.title})`,
    location: item.place_name ?? item.address,
    notes: item.notes,
    estimated_duration_minutes: durationMinutes,
    scheduled_start: dayDate.toISOString(),
    scheduled_end: scheduledEnd.toISOString(),
    is_fixed: true,
    source: "ai_suggested",
  });

  if (insertError) return { error: insertError.message };

  await supabase.from("trip_itinerary_items").update({ added_to_calendar: true }).eq("id", itemId);

  revalidateTravel(trip.id);
  revalidatePath("/calendar");
  revalidatePath("/today");
  return {};
}
