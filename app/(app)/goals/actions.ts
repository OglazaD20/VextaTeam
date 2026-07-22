"use server";

import { revalidatePath } from "next/cache";

import { generateGoalBreakdown } from "@/lib/ai/generate-goal-breakdown";
import { awardXp } from "@/lib/gamification/award";
import { deleteMemoryForSource, recordMemory } from "@/lib/memory/upsert";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import {
  addMilestoneSchema,
  createGoalSchema,
  updateGoalSchema,
  type AddMilestoneInput,
} from "./schema";

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

function revalidateGoals() {
  revalidatePath("/goals");
  revalidatePath("/today");
}

export interface GoalWithMilestones extends Tables<"goals"> {
  milestones: Tables<"goal_milestones">[];
}

export async function getGoals(): Promise<ActionResult<GoalWithMilestones[]>> {
  const { supabase, user } = await requireUser();

  const { data: goals, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  if (!goals || goals.length === 0) return { data: [] };

  const { data: milestones } = await supabase
    .from("goal_milestones")
    .select("*")
    .in(
      "goal_id",
      goals.map((g) => g.id),
    )
    .order("sort_order", { ascending: true });

  const byGoal = new Map<string, Tables<"goal_milestones">[]>();
  for (const milestone of milestones ?? []) {
    if (!byGoal.has(milestone.goal_id)) byGoal.set(milestone.goal_id, []);
    byGoal.get(milestone.goal_id)!.push(milestone);
  }

  return { data: goals.map((g) => ({ ...g, milestones: byGoal.get(g.id) ?? [] })) };
}

export async function createGoal(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const parsed = createGoalSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    priority: formData.get("priority"),
    color: formData.get("color"),
    icon: formData.get("icon"),
    deadline: formData.get("deadline"),
    targetValue: formData.get("targetValue"),
    unit: formData.get("unit"),
    aiBreakdown: formData.get("aiBreakdown"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();
  const data = parsed.data;

  const { data: goal, error } = await supabase
    .from("goals")
    .insert({
      user_id: user.id,
      title: data.title,
      description: data.description ?? null,
      category: data.category,
      priority: data.priority,
      color: data.color ?? null,
      icon: data.icon ?? null,
      deadline: data.deadline ?? null,
      target_value: data.targetValue ?? null,
      unit: data.unit ?? null,
    })
    .select("id")
    .single();

  if (error || !goal) {
    return { error: error?.message ?? "Couldn't create that goal" };
  }

  await recordMemory(supabase, {
    userId: user.id,
    sourceType: "goal",
    sourceId: goal.id,
    title: data.title,
    content: [data.description, `Category: ${data.category}`, data.deadline ? `Deadline: ${data.deadline}` : null]
      .filter(Boolean)
      .join(". "),
    category: data.category,
  });

  if (data.aiBreakdown) {
    try {
      const breakdown = await generateGoalBreakdown({
        title: data.title,
        description: data.description ?? null,
        category: data.category,
        deadline: data.deadline ?? null,
      });

      await supabase.from("goal_milestones").insert(
        breakdown.milestones.map((title, index) => ({
          goal_id: goal.id,
          title,
          sort_order: index,
        })),
      );

      await supabase.from("schedule_items").insert(
        breakdown.firstTasks.map((task) => ({
          user_id: user.id,
          type: "task" as const,
          title: task.title,
          estimated_duration_minutes: task.estimatedDurationMinutes,
          goal_id: goal.id,
          source: "ai_suggested" as const,
        })),
      );
    } catch {
      // AI breakdown is a nice-to-have on top of an already-created goal —
      // never fail goal creation just because the AI call errored.
    }
  }

  revalidateGoals();
  return { data: { id: goal.id } };
}

export async function updateGoal(goalId: string, formData: FormData): Promise<ActionResult> {
  const parsed = updateGoalSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    priority: formData.get("priority"),
    color: formData.get("color"),
    icon: formData.get("icon"),
    deadline: formData.get("deadline"),
    targetValue: formData.get("targetValue"),
    currentValue: formData.get("currentValue"),
    unit: formData.get("unit"),
    manualProgressPct: formData.get("manualProgressPct"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();
  const data = parsed.data;

  const { error } = await supabase
    .from("goals")
    .update({
      title: data.title,
      description: data.description ?? null,
      category: data.category,
      priority: data.priority,
      color: data.color ?? null,
      icon: data.icon ?? null,
      deadline: data.deadline ?? null,
      target_value: data.targetValue ?? null,
      current_value: data.currentValue ?? 0,
      unit: data.unit ?? null,
      manual_progress_pct: data.manualProgressPct ?? null,
    })
    .eq("id", goalId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidateGoals();
  return {};
}

export async function setGoalStatus(
  goalId: string,
  status: "active" | "completed" | "archived",
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("goals")
    .update({ status, completed_at: status === "completed" ? new Date().toISOString() : null })
    .eq("id", goalId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  if (status === "completed") {
    await awardXp(supabase, user.id, "goal_completed", goalId, 100);
  }

  revalidateGoals();
  return {};
}

export async function deleteGoal(goalId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("goals").delete().eq("id", goalId).eq("user_id", user.id);

  if (error) return { error: error.message };
  await deleteMemoryForSource(supabase, user.id, "goal", goalId);
  revalidateGoals();
  return {};
}

export async function addMilestone(input: AddMilestoneInput): Promise<ActionResult> {
  const parsed = addMilestoneSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();
  const data = parsed.data;

  const { data: goal } = await supabase
    .from("goals")
    .select("id")
    .eq("id", data.goalId)
    .eq("user_id", user.id)
    .single();
  if (!goal) return { error: "Goal not found" };

  const { count } = await supabase
    .from("goal_milestones")
    .select("id", { count: "exact", head: true })
    .eq("goal_id", data.goalId);

  const { error } = await supabase.from("goal_milestones").insert({
    goal_id: data.goalId,
    title: data.title,
    sort_order: count ?? 0,
  });

  if (error) return { error: error.message };
  revalidateGoals();
  return {};
}

export async function toggleMilestone(milestoneId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const { data: milestone } = await supabase
    .from("goal_milestones")
    .select("is_completed")
    .eq("id", milestoneId)
    .single();

  if (!milestone) return { error: "Milestone not found" };

  const { error } = await supabase
    .from("goal_milestones")
    .update({
      is_completed: !milestone.is_completed,
      completed_at: !milestone.is_completed ? new Date().toISOString() : null,
    })
    .eq("id", milestoneId);

  if (error) return { error: error.message };
  revalidateGoals();
  return {};
}

export async function deleteMilestone(milestoneId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const { error } = await supabase.from("goal_milestones").delete().eq("id", milestoneId);

  if (error) return { error: error.message };
  revalidateGoals();
  return {};
}

export interface LinkedTask {
  id: string;
  title: string;
  status: string;
}

export async function getLinkedTasks(goalId: string): Promise<ActionResult<LinkedTask[]>> {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("schedule_items")
    .select("id, title, status")
    .eq("goal_id", goalId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { data: data ?? [] };
}
