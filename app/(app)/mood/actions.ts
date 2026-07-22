"use server";

import { revalidatePath } from "next/cache";

import { getTodayKey } from "@/lib/habits/today-key";
import { recordMemory } from "@/lib/memory/upsert";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import { logMoodSchema, type LogMoodInput } from "./schema";

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

function revalidateMood() {
  revalidatePath("/mood");
  revalidatePath("/dashboard");
}

export async function logMood(input: LogMoodInput): Promise<ActionResult> {
  const parsed = logMoodSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();
  const data = parsed.data;

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();
  const timeZone = profile?.timezone ?? "UTC";

  const { data: inserted, error } = await supabase
    .from("mood_logs")
    .insert({
      user_id: user.id,
      mood: data.mood,
      stress: data.stress ?? null,
      energy: data.energy ?? null,
      motivation: data.motivation ?? null,
      productivity: data.productivity ?? null,
      happiness: data.happiness ?? null,
      sleep_quality: data.sleepQuality ?? null,
      anxiety: data.anxiety ?? null,
      confidence: data.confidence ?? null,
      focus: data.focus ?? null,
      note: data.note ?? null,
      logged_for_date: getTodayKey(timeZone),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Only check-ins with a note are recorded as memories — a bare mood tap
  // (mood: 3) isn't something anyone later asks "when did I feel a 3?"
  // about; a written note is exactly that kind of recallable moment.
  if (inserted && data.note) {
    await recordMemory(supabase, {
      userId: user.id,
      sourceType: "mood",
      sourceId: inserted.id,
      title: `Mood check-in`,
      content: data.note,
      category: "wellbeing",
    });
  }

  revalidateMood();
  return {};
}

export async function deleteMoodLog(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("mood_logs").delete().eq("id", id).eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidateMood();
  return {};
}

export async function getMoodLogs(days = 30): Promise<ActionResult<Tables<"mood_logs">[]>> {
  const { supabase, user } = await requireUser();

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const { data, error } = await supabase
    .from("mood_logs")
    .select("*")
    .eq("user_id", user.id)
    .gte("logged_at", since.toISOString())
    .order("logged_at", { ascending: false });

  if (error) return { error: error.message };
  return { data: data ?? [] };
}
