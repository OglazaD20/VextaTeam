"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createHabitSchema } from "./schema";

export interface ActionResult {
  error?: string;
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

export async function createHabit(formData: FormData): Promise<ActionResult> {
  const parsed = createHabitSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    cadence: formData.get("cadence"),
    targetValue: formData.get("targetValue"),
    targetUnit: formData.get("targetUnit"),
    preferredTime: formData.get("preferredTime"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();
  const { name, category, cadence, targetValue, targetUnit, preferredTime } =
    parsed.data;

  const { error } = await supabase.from("habits").insert({
    user_id: user.id,
    name,
    category,
    cadence,
    target_value: targetValue ?? null,
    target_unit: targetUnit || null,
    preferred_time: preferredTime || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/habits");
  return {};
}

export async function archiveHabit(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("habits")
    .update({ is_active: false })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/habits");
  return {};
}

export async function toggleHabitLog(
  habitId: string,
  dateKey: string,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { data: existing, error: fetchError } = await supabase
    .from("habit_logs")
    .select("id")
    .eq("habit_id", habitId)
    .eq("user_id", user.id)
    .eq("logged_for_date", dateKey)
    .maybeSingle();

  if (fetchError) {
    return { error: fetchError.message };
  }

  if (existing) {
    const { error } = await supabase
      .from("habit_logs")
      .delete()
      .eq("id", existing.id)
      .eq("user_id", user.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("habit_logs").insert({
      habit_id: habitId,
      user_id: user.id,
      logged_for_date: dateKey,
      completed: true,
    });

    if (error) return { error: error.message };
  }

  revalidatePath("/habits");
  return {};
}
