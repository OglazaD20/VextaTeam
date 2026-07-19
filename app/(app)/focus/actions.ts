"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { endFocusSessionSchema, startFocusSessionSchema } from "./schema";

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

export async function startFocusSession(
  plannedDurationMinutes: number,
): Promise<ActionResult<{ id: string }>> {
  const parsed = startFocusSessionSchema.safeParse({ plannedDurationMinutes });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("focus_sessions")
    .insert({
      user_id: user.id,
      planned_duration_minutes: parsed.data.plannedDurationMinutes,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Couldn't start session" };
  }

  revalidatePath("/focus");
  return { data: { id: data.id } };
}

export async function endFocusSession(
  id: string,
  input: {
    actualDurationMinutes: number;
    pomodoroCycles: number;
    interrupted: boolean;
    moodAfter?: number;
    energyAfter?: number;
  },
): Promise<ActionResult> {
  const parsed = endFocusSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("focus_sessions")
    .update({
      ended_at: new Date().toISOString(),
      actual_duration_minutes: parsed.data.actualDurationMinutes,
      pomodoro_cycles: parsed.data.pomodoroCycles,
      interrupted: parsed.data.interrupted,
      mood_after: parsed.data.moodAfter ?? null,
      energy_after: parsed.data.energyAfter ?? null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/focus");
  revalidatePath("/stats");
  return {};
}
