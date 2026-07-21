"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { addSuggestionSchema, type AddSuggestionInput } from "./schema";

export interface ActionResult {
  error?: string;
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

  const { error } = await supabase.from("schedule_items").insert({
    user_id: user.id,
    type: "activity",
    title: data.title,
    location: data.placeName,
    notes,
    estimated_duration_minutes: data.estimatedDurationMinutes,
    scheduled_start: scheduledStart,
    scheduled_end: scheduledEnd,
    source: "ai_suggested",
  });

  if (error) return { error: error.message };

  revalidatePath("/today");
  revalidatePath("/calendar");
  revalidatePath("/calendar/day/[date]", "page");
  return {};
}
