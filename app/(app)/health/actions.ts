"use server";

import { revalidatePath } from "next/cache";

import { HEALTH_CARD_KEYS, type HealthCardKey } from "@/lib/health/cards";
import { createClient } from "@/lib/supabase/server";
import type { InsertTables } from "@/types/database";
import { logHealthMetricsSchema } from "./schema";

export interface ActionResult {
  error?: string;
}

const FIELD_TO_FORM_KEY = {
  sleep_hours: "sleepHours",
  sleep_quality: "sleepQuality",
  bedtime: "bedtime",
  wake_time: "wakeTime",
  steps: "steps",
  calories_burned: "caloriesBurned",
  resting_heart_rate: "restingHeartRate",
  avg_heart_rate: "avgHeartRate",
  active_minutes: "activeMinutes",
  exercise_type: "exerciseType",
  exercise_minutes: "exerciseMinutes",
  distance_km: "distanceKm",
  notes: "notes",
} as const;

/**
 * Quick per-card edits (e.g. just "Steps") only submit the one or two fields
 * they touch — so this merges onto the existing row for that date rather
 * than upserting a full row, which would otherwise null out every other
 * already-logged field for the day.
 */
export async function logHealthMetrics(formData: FormData): Promise<ActionResult> {
  const parsed = logHealthMetricsSchema.safeParse({
    date: formData.get("date"),
    sleepHours: formData.get("sleepHours"),
    sleepQuality: formData.get("sleepQuality"),
    bedtime: formData.get("bedtime"),
    wakeTime: formData.get("wakeTime"),
    steps: formData.get("steps"),
    caloriesBurned: formData.get("caloriesBurned"),
    restingHeartRate: formData.get("restingHeartRate"),
    avgHeartRate: formData.get("avgHeartRate"),
    activeMinutes: formData.get("activeMinutes"),
    exerciseType: formData.get("exerciseType"),
    exerciseMinutes: formData.get("exerciseMinutes"),
    distanceKm: formData.get("distanceKm"),
    notes: formData.get("notes"),
  });

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

  const { data: existing } = await supabase
    .from("health_metrics")
    .select("*")
    .eq("user_id", user.id)
    .eq("logged_for_date", data.date)
    .maybeSingle();

  const merged: InsertTables<"health_metrics"> = { user_id: user.id, logged_for_date: data.date };
  for (const [column, formKey] of Object.entries(FIELD_TO_FORM_KEY)) {
    (merged as Record<string, unknown>)[column] = formData.has(formKey)
      ? (data[formKey as keyof typeof data] ?? null)
      : (existing?.[column as keyof typeof existing] ?? null);
  }

  const { error } = await supabase
    .from("health_metrics")
    .upsert(merged, { onConflict: "user_id,logged_for_date" });

  if (error) return { error: error.message };
  revalidatePath("/health");
  return {};
}

export async function updateVisibleHealthCards(cards: HealthCardKey[]): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const cleaned = cards.filter((c) => HEALTH_CARD_KEYS.includes(c));

  const { error } = await supabase
    .from("user_settings")
    .upsert(
      { user_id: user.id, visible_health_cards: cleaned },
      { onConflict: "user_id" },
    );

  if (error) return { error: error.message };
  revalidatePath("/health");
  return {};
}

export async function deleteHealthMetrics(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("health_metrics")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/health");
  return {};
}
