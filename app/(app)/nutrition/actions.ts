"use server";

import { revalidatePath } from "next/cache";

import { awardXp } from "@/lib/gamification/award";
import { createClient } from "@/lib/supabase/server";
import { scaleMacros, sumMacros } from "@/lib/nutrition/macros";
import type { MealType, Tables, UpdateTables } from "@/types/database";
import {
  createRecipeSchema,
  logFoodSchema,
  logWaterSchema,
  logWeightSchema,
  quickAddFoodSchema,
  saveMealTemplateSchema,
  updateFoodLogSchema,
  updateNutritionGoalsSchema,
  type CreateRecipeInput,
  type SaveMealTemplateInput,
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

function revalidateNutrition() {
  revalidatePath("/nutrition");
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
    baseSugarG: formData.get("baseSugarG"),
    baseSodiumMg: formData.get("baseSodiumMg"),
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
        sugar_g: data.baseSugarG,
        sodium_mg: data.baseSodiumMg,
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
      sugarG: data.baseSugarG,
      sodiumMg: data.baseSodiumMg,
    },
    data.quantity,
  );

  const { data: inserted, error } = await supabase
    .from("food_logs")
    .insert({
      user_id: user.id,
      food_id: foodId,
      meal_type: data.mealType,
      quantity: data.quantity,
      calories: scaled.calories,
      protein_g: scaled.proteinG,
      fat_g: scaled.fatG,
      carbs_g: scaled.carbsG,
      fiber_g: scaled.fiberG,
      sugar_g: scaled.sugarG,
      sodium_mg: scaled.sodiumMg,
      notes: data.notes || null,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  if (inserted) await awardXp(supabase, user.id, "food_logged", inserted.id, 5);

  revalidateNutrition();
  return {};
}

export async function updateFoodLog(id: string, formData: FormData): Promise<ActionResult> {
  const parsed = updateFoodLogSchema.safeParse({
    quantity: formData.get("quantity"),
    mealType: formData.get("mealType"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();
  const data = parsed.data;

  const { data: log, error: fetchError } = await supabase
    .from("food_logs")
    .select("food_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !log) {
    return { error: fetchError?.message ?? "Log entry not found" };
  }

  let update: UpdateTables<"food_logs"> = {
    quantity: data.quantity,
    meal_type: data.mealType,
    notes: data.notes || null,
  };

  if (log.food_id) {
    const { data: food } = await supabase
      .from("foods")
      .select("calories, protein_g, fat_g, carbs_g, fiber_g, sugar_g, sodium_mg")
      .eq("id", log.food_id)
      .single();

    if (food) {
      const scaled = scaleMacros(
        {
          calories: food.calories,
          proteinG: food.protein_g,
          fatG: food.fat_g,
          carbsG: food.carbs_g,
          fiberG: food.fiber_g,
          sugarG: food.sugar_g,
          sodiumMg: food.sodium_mg,
        },
        data.quantity,
      );
      update = {
        ...update,
        calories: scaled.calories,
        protein_g: scaled.proteinG,
        fat_g: scaled.fatG,
        carbs_g: scaled.carbsG,
        fiber_g: scaled.fiberG,
        sugar_g: scaled.sugarG,
        sodium_mg: scaled.sodiumMg,
      };
    }
  }

  const { error } = await supabase
    .from("food_logs")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidateNutrition();
  return {};
}

export async function duplicateFoodLog(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { data: original, error: fetchError } = await supabase
    .from("food_logs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !original) {
    return { error: fetchError?.message ?? "Log entry not found" };
  }

  const { error } = await supabase.from("food_logs").insert({
    user_id: user.id,
    food_id: original.food_id,
    meal_type: original.meal_type,
    quantity: original.quantity,
    calories: original.calories,
    protein_g: original.protein_g,
    fat_g: original.fat_g,
    carbs_g: original.carbs_g,
    fiber_g: original.fiber_g,
    sugar_g: original.sugar_g,
    sodium_mg: original.sodium_mg,
    notes: original.notes,
  });

  if (error) return { error: error.message };
  revalidateNutrition();
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
  revalidateNutrition();
  return {};
}

/**
 * Quick-add flow: creates the food (per 100g/ml, the European label
 * convention, or per portion) and immediately logs it as eaten today in one
 * step, so it counts toward calories/macros right away instead of just
 * sitting in the library until separately searched and logged.
 */
export async function createAndLogFood(formData: FormData): Promise<ActionResult> {
  const parsed = quickAddFoodSchema.safeParse({
    name: formData.get("name"),
    brand: formData.get("brand"),
    mealType: formData.get("mealType"),
    basis: formData.get("basis"),
    amount: formData.get("amount"),
    calories: formData.get("calories"),
    proteinG: formData.get("proteinG"),
    fatG: formData.get("fatG"),
    carbsG: formData.get("carbsG"),
    fiberG: formData.get("fiberG"),
    sugarG: formData.get("sugarG"),
    sodiumMg: formData.get("sodiumMg"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();
  const data = parsed.data;
  const isPer100 = data.basis === "per100g";

  const { data: created, error: createError } = await supabase
    .from("foods")
    .insert({
      name: data.name,
      brand: data.brand || null,
      calories: data.calories,
      protein_g: data.proteinG,
      fat_g: data.fatG,
      carbs_g: data.carbsG,
      fiber_g: data.fiberG,
      sugar_g: data.sugarG,
      sodium_mg: data.sodiumMg,
      serving_size: isPer100 ? 100 : 1,
      serving_unit: isPer100 ? "g" : "portion",
      default_meal_type: data.mealType,
      source: "custom",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (createError || !created) {
    return { error: createError?.message ?? "Couldn't save that food" };
  }

  const scaleFactor = isPer100 ? data.amount / 100 : data.amount;
  const scaled = scaleMacros(
    {
      calories: data.calories,
      proteinG: data.proteinG,
      fatG: data.fatG,
      carbsG: data.carbsG,
      fiberG: data.fiberG,
      sugarG: data.sugarG,
      sodiumMg: data.sodiumMg,
    },
    scaleFactor,
  );

  const { data: loggedFood, error: logError } = await supabase
    .from("food_logs")
    .insert({
      user_id: user.id,
      food_id: created.id,
      meal_type: data.mealType,
      quantity: scaleFactor,
      calories: scaled.calories,
      protein_g: scaled.proteinG,
      fat_g: scaled.fatG,
      carbs_g: scaled.carbsG,
      fiber_g: scaled.fiberG,
      sugar_g: scaled.sugarG,
      sodium_mg: scaled.sodiumMg,
    })
    .select("id")
    .single();

  if (logError) return { error: logError.message };

  if (loggedFood) await awardXp(supabase, user.id, "food_logged", loggedFood.id, 5);

  revalidateNutrition();
  return {};
}

export async function logWater(formData: FormData): Promise<ActionResult> {
  const parsed = logWaterSchema.safeParse({ amountMl: formData.get("amountMl") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();

  const { data: inserted, error } = await supabase
    .from("water_logs")
    .insert({
      user_id: user.id,
      amount_ml: parsed.data.amountMl,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  if (inserted) await awardXp(supabase, user.id, "water_logged", inserted.id, 3);
  revalidateNutrition();
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
  revalidateNutrition();
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
  revalidateNutrition();
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
  revalidateNutrition();
  return {};
}

export async function saveMealAsTemplate(input: SaveMealTemplateInput): Promise<ActionResult> {
  const parsed = saveMealTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();
  const data = parsed.data;

  const { data: template, error: templateError } = await supabase
    .from("meal_templates")
    .insert({ user_id: user.id, name: data.name, meal_type: data.mealType ?? null })
    .select("id")
    .single();

  if (templateError || !template) {
    return { error: templateError?.message ?? "Couldn't save that template" };
  }

  const { error: itemsError } = await supabase.from("meal_template_items").insert(
    data.items.map((item, index) => ({
      template_id: template.id,
      food_id: item.foodId,
      quantity: item.quantity,
      sort_order: index,
    })),
  );

  if (itemsError) return { error: itemsError.message };
  revalidateNutrition();
  return {};
}

export async function getMealTemplates(): Promise<
  ActionResult<(Tables<"meal_templates"> & { itemCount: number })[]>
> {
  const { supabase, user } = await requireUser();

  const { data: templates, error } = await supabase
    .from("meal_templates")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  if (!templates || templates.length === 0) return { data: [] };

  const { data: items } = await supabase
    .from("meal_template_items")
    .select("template_id")
    .in(
      "template_id",
      templates.map((t) => t.id),
    );

  const counts = new Map<string, number>();
  for (const item of items ?? []) {
    counts.set(item.template_id, (counts.get(item.template_id) ?? 0) + 1);
  }

  return {
    data: templates.map((t) => ({ ...t, itemCount: counts.get(t.id) ?? 0 })),
  };
}

export async function deleteMealTemplate(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("meal_templates")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidateNutrition();
  return {};
}

export async function applyMealTemplate(
  templateId: string,
  mealTypeOverride?: MealType,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { data: template, error: templateError } = await supabase
    .from("meal_templates")
    .select("*")
    .eq("id", templateId)
    .eq("user_id", user.id)
    .single();

  if (templateError || !template) {
    return { error: templateError?.message ?? "Template not found" };
  }

  const { data: items, error: itemsError } = await supabase
    .from("meal_template_items")
    .select("food_id, quantity")
    .eq("template_id", templateId)
    .order("sort_order", { ascending: true });

  if (itemsError) return { error: itemsError.message };
  if (!items || items.length === 0) return { error: "That template has no items" };

  const foodIds = items.map((i) => i.food_id).filter((id): id is string => !!id);
  const { data: foods, error: foodsError } = await supabase
    .from("foods")
    .select("*")
    .in("id", foodIds);

  if (foodsError) return { error: foodsError.message };

  const foodsById = new Map((foods ?? []).map((f) => [f.id, f]));
  const mealType = mealTypeOverride ?? template.meal_type ?? "snack";

  const rows = items
    .map((item) => {
      const food = item.food_id ? foodsById.get(item.food_id) : null;
      if (!food) return null;
      const scaled = scaleMacros(
        {
          calories: food.calories,
          proteinG: food.protein_g,
          fatG: food.fat_g,
          carbsG: food.carbs_g,
          fiberG: food.fiber_g,
          sugarG: food.sugar_g,
          sodiumMg: food.sodium_mg,
        },
        item.quantity,
      );
      return {
        user_id: user.id,
        food_id: food.id,
        meal_type: mealType,
        quantity: item.quantity,
        calories: scaled.calories,
        protein_g: scaled.proteinG,
        fat_g: scaled.fatG,
        carbs_g: scaled.carbsG,
        fiber_g: scaled.fiberG,
        sugar_g: scaled.sugarG,
        sodium_mg: scaled.sodiumMg,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (rows.length === 0) return { error: "None of that template's foods could be found" };

  const { error } = await supabase.from("food_logs").insert(rows);
  if (error) return { error: error.message };

  revalidateNutrition();
  return {};
}

export async function createRecipe(input: CreateRecipeInput): Promise<ActionResult<{ id: string }>> {
  const parsed = createRecipeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();
  const data = parsed.data;

  const { data: ingredientFoods, error: foodsError } = await supabase
    .from("foods")
    .select("*")
    .in(
      "id",
      data.ingredients.map((i) => i.foodId),
    );

  if (foodsError) return { error: foodsError.message };

  const foodsById = new Map((ingredientFoods ?? []).map((f) => [f.id, f]));
  const scaledPerIngredient = data.ingredients.map((ingredient) => {
    const food = foodsById.get(ingredient.foodId);
    if (!food) return null;
    return scaleMacros(
      {
        calories: food.calories,
        proteinG: food.protein_g,
        fatG: food.fat_g,
        carbsG: food.carbs_g,
        fiberG: food.fiber_g,
        sugarG: food.sugar_g,
        sodiumMg: food.sodium_mg,
      },
      ingredient.quantity,
    );
  });

  if (scaledPerIngredient.some((m) => m === null)) {
    return { error: "One or more ingredients couldn't be found" };
  }

  const total = sumMacros(scaledPerIngredient as NonNullable<(typeof scaledPerIngredient)[number]>[]);
  const perServing = {
    calories: total.calories / data.servings,
    proteinG: total.proteinG / data.servings,
    fatG: total.fatG / data.servings,
    carbsG: total.carbsG / data.servings,
    fiberG: total.fiberG / data.servings,
    sugarG: total.sugarG / data.servings,
    sodiumMg: total.sodiumMg / data.servings,
  };

  const { data: recipe, error: recipeError } = await supabase
    .from("foods")
    .insert({
      name: data.name,
      calories: Math.round(perServing.calories * 10) / 10,
      protein_g: Math.round(perServing.proteinG * 10) / 10,
      fat_g: Math.round(perServing.fatG * 10) / 10,
      carbs_g: Math.round(perServing.carbsG * 10) / 10,
      fiber_g: Math.round(perServing.fiberG * 10) / 10,
      sugar_g: Math.round(perServing.sugarG * 10) / 10,
      sodium_mg: Math.round(perServing.sodiumMg * 10) / 10,
      serving_size: 1,
      serving_unit: "serving",
      default_meal_type: data.defaultMealType ?? null,
      source: "recipe",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (recipeError || !recipe) {
    return { error: recipeError?.message ?? "Couldn't save that recipe" };
  }

  const { error: ingredientsError } = await supabase.from("recipe_ingredients").insert(
    data.ingredients.map((ingredient, index) => ({
      recipe_food_id: recipe.id,
      ingredient_food_id: ingredient.foodId,
      quantity: ingredient.quantity,
      sort_order: index,
    })),
  );

  if (ingredientsError) return { error: ingredientsError.message };

  revalidateNutrition();
  return { data: { id: recipe.id } };
}

export async function getUserRecipes(): Promise<ActionResult<Tables<"foods">[]>> {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("foods")
    .select("*")
    .eq("source", "recipe")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export async function deleteRecipe(foodId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("foods")
    .delete()
    .eq("id", foodId)
    .eq("created_by", user.id)
    .eq("source", "recipe");

  if (error) return { error: error.message };
  revalidateNutrition();
  return {};
}

export interface LogFoodItemInput {
  foodId: string | null;
  name: string;
  quantity: number;
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
  mealType: MealType;
}

/** Confirms and commits nutrition items the AI chat estimated — the numbers come from the chat's own estimate, never recomputed here, so what the user saw is exactly what gets logged. */
export async function logFoodItemsBulk(items: LogFoodItemInput[]): Promise<ActionResult> {
  if (items.length === 0) return { error: "No items to log" };

  const { supabase, user } = await requireUser();

  const { data: inserted, error } = await supabase
    .from("food_logs")
    .insert(
      items.map((item) => ({
        user_id: user.id,
        food_id: item.foodId,
        name: item.name,
        meal_type: item.mealType,
        quantity: item.quantity,
        calories: item.calories,
        protein_g: item.proteinG,
        fat_g: item.fatG,
        carbs_g: item.carbsG,
        fiber_g: item.fiberG,
        sugar_g: item.sugarG,
        sodium_mg: item.sodiumMg,
      })),
    )
    .select("id");

  if (error) return { error: error.message };

  for (const row of inserted ?? []) {
    await awardXp(supabase, user.id, "food_logged", row.id, 5);
  }

  revalidateNutrition();
  return {};
}
