"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { scaleMacros } from "@/lib/nutrition/macros";
import {
  logFoodSchema,
  logWaterSchema,
  logWeightSchema,
  updateNutritionGoalsSchema,
} from "./schema";

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

export async function logFood(formData: FormData): Promise<ActionResult> {
  const parsed = logFoodSchema.safeParse({
    foodId: formData.get("foodId") || undefined,
    name: formData.get("name"),
    mealType: formData.get("mealType"),
    quantity: formData.get("quantity"),
    baseCalories: formData.get("baseCalories"),
    baseProteinG: formData.get("baseProteinG"),
    baseFatG: formData.get("baseFatG"),
    baseCarbsG: formData.get("baseCarbsG"),
    baseFiberG: formData.get("baseFiberG"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();
  const data = parsed.data;

  let foodId = data.foodId ?? null;

  if (!foodId) {
    const { data: created, error: createError } = await supabase
      .from("foods")
      .insert({
        name: data.name,
        calories: data.baseCalories,
        protein_g: data.baseProteinG,
        fat_g: data.baseFatG,
        carbs_g: data.baseCarbsG,
        fiber_g: data.baseFiberG,
        serving_size: 1,
        serving_unit: "serving",
        source: "custom",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (createError || !created) {
      return { error: createError?.message ?? "Couldn't save that food" };
    }
    foodId = created.id;
  }

  const scaled = scaleMacros(
    {
      calories: data.baseCalories,
      proteinG: data.baseProteinG,
      fatG: data.baseFatG,
      carbsG: data.baseCarbsG,
      fiberG: data.baseFiberG,
    },
    data.quantity,
  );

  const { error } = await supabase.from("food_logs").insert({
    user_id: user.id,
    food_id: foodId,
    meal_type: data.mealType,
    quantity: data.quantity,
    calories: scaled.calories,
    protein_g: scaled.proteinG,
    fat_g: scaled.fatG,
    carbs_g: scaled.carbsG,
    fiber_g: scaled.fiberG,
    notes: data.notes || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/nutrition");
  return {};
}

export async function deleteFoodLog(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("food_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/nutrition");
  return {};
}

export async function logWater(formData: FormData): Promise<ActionResult> {
  const parsed = logWaterSchema.safeParse({ amountMl: formData.get("amountMl") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("water_logs").insert({
    user_id: user.id,
    amount_ml: parsed.data.amountMl,
  });

  if (error) return { error: error.message };
  revalidatePath("/nutrition");
  return {};
}

export async function deleteWaterLog(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("water_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/nutrition");
  return {};
}

export async function logWeight(formData: FormData): Promise<ActionResult> {
  const parsed = logWeightSchema.safeParse({
    date: formData.get("date"),
    weightKg: formData.get("weightKg"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("body_metrics")
    .upsert(
      { user_id: user.id, logged_for_date: parsed.data.date, weight_kg: parsed.data.weightKg },
      { onConflict: "user_id,logged_for_date" },
    );

  if (error) return { error: error.message };
  revalidatePath("/nutrition");
  return {};
}

export async function updateNutritionGoals(formData: FormData): Promise<ActionResult> {
  const parsed = updateNutritionGoalsSchema.safeParse({
    dailyCalorieGoal: formData.get("dailyCalorieGoal"),
    proteinGoalG: formData.get("proteinGoalG"),
    carbsGoalG: formData.get("carbsGoalG"),
    fatGoalG: formData.get("fatGoalG"),
    fiberGoalG: formData.get("fiberGoalG"),
    waterGoalMl: formData.get("waterGoalMl"),
    heightCm: formData.get("heightCm"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();
  const data = parsed.data;

  const { error } = await supabase.from("nutrition_settings").upsert(
    {
      user_id: user.id,
      daily_calorie_goal: data.dailyCalorieGoal,
      protein_goal_g: data.proteinGoalG,
      carbs_goal_g: data.carbsGoalG,
      fat_goal_g: data.fatGoalG,
      fiber_goal_g: data.fiberGoalG,
      water_goal_ml: data.waterGoalMl,
      height_cm: data.heightCm ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) return { error: error.message };
  revalidatePath("/nutrition");
  return {};
}
