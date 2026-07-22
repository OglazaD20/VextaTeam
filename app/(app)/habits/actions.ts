"use server";

import { revalidatePath } from "next/cache";

import { awardXp } from "@/lib/gamification/award";
import { createClient } from "@/lib/supabase/server";
import { createHabitSchema, updateHabitSchema, type CreateHabitInput } from "./schema";

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

function readHabitFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    category: formData.get("category"),
    cadence: formData.get("cadence"),
    targetValue: formData.get("targetValue"),
    targetUnit: formData.get("targetUnit"),
    preferredTime: formData.get("preferredTime"),
    reminderEnabled: formData.get("reminderEnabled") === "true",
  };
}

function habitFieldsToRow(fields: Partial<CreateHabitInput>) {
  return {
    ...(fields.name !== undefined && { name: fields.name }),
    ...(fields.category !== undefined && { category: fields.category }),
    ...(fields.cadence !== undefined && { cadence: fields.cadence }),
    ...(fields.targetValue !== undefined && { target_value: fields.targetValue ?? null }),
    ...(fields.targetUnit !== undefined && { target_unit: fields.targetUnit || null }),
    ...(fields.preferredTime !== undefined && {
      preferred_time: fields.preferredTime || null,
    }),
    ...(fields.reminderEnabled !== undefined && {
      reminder_enabled: fields.reminderEnabled,
    }),
  };
}

export async function createHabit(formData: FormData): Promise<ActionResult> {
  const parsed = createHabitSchema.safeParse(readHabitFormData(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();
  const {
    name,
    category,
    cadence,
    targetValue,
    targetUnit,
    preferredTime,
    reminderEnabled,
  } = parsed.data;

  const { error } = await supabase.from("habits").insert({
    user_id: user.id,
    name,
    category,
    cadence,
    target_value: targetValue ?? null,
    target_unit: targetUnit || null,
    preferred_time: preferredTime || null,
    reminder_enabled: reminderEnabled,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/habits");
  return {};
}

export async function updateHabit(id: string, formData: FormData): Promise<ActionResult> {
  const parsed = updateHabitSchema.safeParse(readHabitFormData(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("habits")
    .update(habitFieldsToRow(parsed.data))
    .eq("id", id)
    .eq("user_id", user.id);

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

export async function pauseHabit(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("habits")
    .update({ paused_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/habits");
  return {};
}

export async function resumeHabit(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("habits")
    .update({ paused_at: null })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/habits");
  return {};
}

export async function reorderHabits(orderedIds: string[]): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("habits")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("user_id", user.id),
    ),
  );

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
    const { data: inserted, error } = await supabase
      .from("habit_logs")
      .insert({
        habit_id: habitId,
        user_id: user.id,
        logged_for_date: dateKey,
        completed: true,
      })
      .select("id")
      .single();

    if (error) return { error: error.message };
    if (inserted) await awardXp(supabase, user.id, "habit_logged", inserted.id, 8);
  }

  revalidatePath("/habits");
  return {};
}
