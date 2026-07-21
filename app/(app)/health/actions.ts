"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { logHealthMetricsSchema } from "./schema";

export interface ActionResult {
  error?: string;
}

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
  const { error } = await supabase.from("health_metrics").upsert(
    {
      user_id: user.id,
      logged_for_date: data.date,
      sleep_hours: data.sleepHours ?? null,
      sleep_quality: data.sleepQuality ?? null,
      bedtime: data.bedtime ?? null,
      wake_time: data.wakeTime ?? null,
      steps: data.steps ?? null,
      calories_burned: data.caloriesBurned ?? null,
      resting_heart_rate: data.restingHeartRate ?? null,
      avg_heart_rate: data.avgHeartRate ?? null,
      active_minutes: data.activeMinutes ?? null,
      exercise_type: data.exerciseType ?? null,
      exercise_minutes: data.exerciseMinutes ?? null,
      distance_km: data.distanceKm ?? null,
      notes: data.notes ?? null,
    },
    { onConflict: "user_id,logged_for_date" },
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
