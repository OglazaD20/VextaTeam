"use server";

import { revalidatePath } from "next/cache";

import { generateBehaviorSuggestions } from "@/lib/automations/suggest";
import { parseAutomationRequest, type ParsedAutomation } from "@/lib/automations/parse-automation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import { upsertAutomationSchema, type UpsertAutomationInput } from "./schema";

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

export interface AutomationWithLastRun extends Tables<"automations"> {
  lastRun: Pick<Tables<"automation_runs">, "status" | "ran_at" | "actions_taken"> | null;
}

export interface AutomationsOverview {
  automations: AutomationWithLastRun[];
  suggestions: Tables<"automation_suggestions">[];
}

export async function getAutomationsOverview(): Promise<ActionResult<AutomationsOverview>> {
  const { supabase, user } = await requireUser();

  const [{ data: automations, error }, { data: suggestions }] = await Promise.all([
    supabase.from("automations").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase
      .from("automation_suggestions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  if (error) return { error: error.message };

  const automationIds = (automations ?? []).map((a) => a.id);
  const lastRunByAutomation = new Map<string, Pick<Tables<"automation_runs">, "status" | "ran_at" | "actions_taken">>();

  if (automationIds.length > 0) {
    const { data: runs } = await supabase
      .from("automation_runs")
      .select("automation_id, status, ran_at, actions_taken")
      .in("automation_id", automationIds)
      .order("ran_at", { ascending: false });

    for (const run of runs ?? []) {
      if (!lastRunByAutomation.has(run.automation_id)) {
        lastRunByAutomation.set(run.automation_id, { status: run.status, ran_at: run.ran_at, actions_taken: run.actions_taken });
      }
    }
  }

  return {
    data: {
      automations: (automations ?? []).map((a) => ({ ...a, lastRun: lastRunByAutomation.get(a.id) ?? null })),
      suggestions: suggestions ?? [],
    },
  };
}

export async function getAutomationRuns(automationId: string): Promise<ActionResult<Tables<"automation_runs">[]>> {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("automation_runs")
    .select("*")
    .eq("automation_id", automationId)
    .eq("user_id", user.id)
    .order("ran_at", { ascending: false })
    .limit(20);

  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export async function upsertAutomation(input: UpsertAutomationInput): Promise<ActionResult<{ id: string }>> {
  const parsed = upsertAutomationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();
  const data = parsed.data;

  const row = {
    user_id: user.id,
    name: data.name,
    description: data.description ?? null,
    enabled: data.enabled,
    trigger: data.trigger as unknown as Record<string, unknown>,
    condition_groups: data.conditionGroups as unknown as Record<string, unknown>,
    actions: data.actions as unknown as Record<string, unknown>,
  };

  if (data.id) {
    const { error } = await supabase.from("automations").update(row).eq("id", data.id).eq("user_id", user.id);
    if (error) return { error: error.message };
    revalidatePath("/automations");
    return { data: { id: data.id } };
  }

  const { data: inserted, error } = await supabase.from("automations").insert(row).select("id").single();
  if (error) return { error: error.message };

  revalidatePath("/automations");
  return { data: { id: inserted.id } };
}

export async function deleteAutomation(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("automations").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/automations");
  return {};
}

export async function toggleAutomation(id: string, enabled: boolean): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("automations").update({ enabled }).eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/automations");
  return {};
}

export interface GenerateAutomationResult {
  parsed?: ParsedAutomation;
  error?: string;
}

export async function generateAutomationFromText(request: string): Promise<GenerateAutomationResult> {
  const trimmed = request.trim();
  if (!trimmed) return { error: "Describe what you want automated" };

  const parsed = await parseAutomationRequest(trimmed);
  if (!parsed) {
    return { error: "Couldn't turn that into an automation — try describing a specific trigger and action." };
  }
  return { parsed };
}

export async function acceptSuggestion(suggestionId: string): Promise<ActionResult<{ id: string }>> {
  const { supabase, user } = await requireUser();

  const { data: suggestion, error: fetchError } = await supabase
    .from("automation_suggestions")
    .select("*")
    .eq("id", suggestionId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !suggestion) return { error: fetchError?.message ?? "Suggestion not found" };

  const { data: inserted, error } = await supabase
    .from("automations")
    .insert({
      user_id: user.id,
      name: suggestion.title,
      description: suggestion.description,
      enabled: true,
      source: "ai_generated",
      trigger: suggestion.proposed_trigger,
      condition_groups: suggestion.proposed_condition_groups,
      actions: suggestion.proposed_actions,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabase.from("automation_suggestions").update({ status: "accepted" }).eq("id", suggestionId);
  revalidatePath("/automations");
  return { data: { id: inserted.id } };
}

export async function dismissSuggestion(suggestionId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("automation_suggestions")
    .update({ status: "dismissed" })
    .eq("id", suggestionId)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/automations");
  return {};
}

export async function refreshSuggestions(): Promise<ActionResult<{ created: number }>> {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", user.id).single();
  const created = await generateBehaviorSuggestions(supabase, user.id, profile?.timezone ?? "UTC");
  revalidatePath("/automations");
  return { data: { created } };
}
