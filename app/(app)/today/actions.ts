"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createScheduleItemSchema } from "./schema";

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

export async function createScheduleItem(
  formData: FormData,
): Promise<ActionResult> {
  const parsed = createScheduleItemSchema.safeParse({
    title: formData.get("title"),
    type: formData.get("type"),
    priority: formData.get("priority"),
    location: formData.get("location"),
    isFixed: formData.get("isFixed") === "true",
    scheduledStart: formData.get("scheduledStart"),
    scheduledEnd: formData.get("scheduledEnd"),
    estimatedDurationMinutes: formData.get("estimatedDurationMinutes"),
    dueAt: formData.get("dueAt"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();
  const { location, ...rest } = parsed.data;

  const { error } = await supabase.from("schedule_items").insert({
    user_id: user.id,
    title: rest.title,
    type: rest.type,
    priority: rest.priority,
    is_fixed: rest.isFixed,
    location: location || null,
    scheduled_start: rest.scheduledStart ?? null,
    scheduled_end: rest.scheduledEnd ?? null,
    due_at: rest.dueAt ?? null,
    estimated_duration_minutes: rest.estimatedDurationMinutes ?? null,
    source: "lifeflow",
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/today");
  return {};
}

export async function setScheduleItemStatus(
  id: string,
  status: "completed" | "planned" | "skipped" | "cancelled",
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("schedule_items")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/today");
  return {};
}

export async function deleteScheduleItem(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("schedule_items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/today");
  return {};
}
