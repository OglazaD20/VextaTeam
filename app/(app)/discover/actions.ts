"use server";

import { revalidatePath } from "next/cache";

import { discoverActivities, type ActivitySuggestion } from "@/lib/activities/discover";
import { pushIfGoogleConnected } from "@/lib/calendar/sync";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import {
  addEventSchema,
  addSuggestionSchema,
  generateSimilarSchema,
  saveActivitySchema,
  type AddEventInput,
  type AddSuggestionInput,
  type GenerateSimilarInput,
  type SaveActivityInput,
} from "./schema";

export interface ActionResult {
  error?: string;
}

function revalidateSchedule() {
  revalidatePath("/today");
  revalidatePath("/calendar");
  revalidatePath("/calendar/day/[date]", "page");
}

export async function addSuggestionToSchedule(input: AddSuggestionInput): Promise<ActionResult> {
  const parsed = addSuggestionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const data = parsed.data;
  const notes = [data.pitch, data.address].filter(Boolean).join(" — ") || null;

  let scheduledStart: string | null = null;
  let scheduledEnd: string | null = null;
  if (data.whenIso) {
    const start = new Date(data.whenIso);
    scheduledStart = start.toISOString();
    scheduledEnd = new Date(start.getTime() + data.estimatedDurationMinutes * 60_000).toISOString();
  }

  const { data: inserted, error } = await supabase
    .from("schedule_items")
    .insert({
      user_id: user.id,
      type: "activity",
      title: data.title,
      location: data.placeName,
      notes,
      estimated_duration_minutes: data.estimatedDurationMinutes,
      scheduled_start: scheduledStart,
      scheduled_end: scheduledEnd,
      is_fixed: Boolean(scheduledStart),
      source: "ai_suggested",
    })
    .select("id, title, location, scheduled_start, scheduled_end, external_event_id, is_fixed")
    .single();

  if (error) return { error: error.message };

  if (inserted) {
    await pushIfGoogleConnected(supabase, user.id, inserted);
  }

  revalidateSchedule();
  return {};
}

/** Adds a real ticketed event (fixed time, from Ticketmaster) to the schedule and pushes it to Google if connected. */
export async function addEventToSchedule(input: AddEventInput): Promise<ActionResult> {
  const parsed = addEventSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const data = parsed.data;
  const start = new Date(data.startIso);
  const end = new Date(start.getTime() + data.estimatedDurationMinutes * 60_000);
  const notes = [data.address, data.url].filter(Boolean).join(" — ") || null;

  const { data: inserted, error } = await supabase
    .from("schedule_items")
    .insert({
      user_id: user.id,
      type: "activity",
      title: data.name,
      location: data.venueName,
      notes,
      estimated_duration_minutes: data.estimatedDurationMinutes,
      scheduled_start: start.toISOString(),
      scheduled_end: end.toISOString(),
      is_fixed: true,
      source: "ai_suggested",
    })
    .select("id, title, location, scheduled_start, scheduled_end, external_event_id, is_fixed")
    .single();

  if (error) return { error: error.message };

  if (inserted) {
    await pushIfGoogleConnected(supabase, user.id, inserted);
  }

  revalidateSchedule();
  return {};
}

export async function saveActivity(input: SaveActivityInput): Promise<ActionResult> {
  const parsed = saveActivitySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const data = parsed.data;
  const { error } = await supabase.from("saved_activities").insert({
    user_id: user.id,
    kind: data.kind,
    title: data.title,
    subtitle: data.subtitle,
    lat: data.lat,
    lng: data.lng,
    starts_at: data.startsAt ?? null,
    data: data.data,
  });

  if (error) return { error: error.message };
  revalidatePath("/discover");
  return {};
}

export async function unsaveActivity(savedId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("saved_activities")
    .delete()
    .eq("id", savedId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/discover");
  return {};
}

export async function getSavedActivities(): Promise<Tables<"saved_activities">[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("saved_activities")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return data ?? [];
}

export interface GenerateSimilarResult {
  suggestions?: ActivitySuggestion[];
  error?: string;
}

export async function generateSimilarActivities(
  input: GenerateSimilarInput,
): Promise<GenerateSimilarResult> {
  const parsed = generateSimilarSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const data = parsed.data;
  try {
    const suggestions = await discoverActivities({
      categories: [data.category],
      location: data.location,
      maxDistanceKm: data.maxDistanceKm,
      availableMinutes: data.availableMinutes,
      budget: data.budget,
      indoorOutdoor: data.indoorOutdoor,
      social: data.social,
      excludePlaceNames: [data.referencePlaceName],
      similarTo: { placeName: data.referencePlaceName, pitch: data.referencePitch },
    });
    return { suggestions };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't find similar activities" };
  }
}
