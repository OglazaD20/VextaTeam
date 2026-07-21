"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { scaleMacros, sumMacros } from "@/lib/nutrition/macros";
import type { MealType, Tables, UpdateTables } from "@/types/database";
import {
  createCustomFoodSchema,
  createRecipeSchema,
  logFoodSchema,
  logWaterSchema,
  logWeightSchema,
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
    sugar_g: scaled.sugarG,
    sodium_mg: scaled.sodiumMg,
    notes: data.notes || null,
  });

  if (error) {
    return { error: error.message };
  }

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

export async function createCustomFood(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const parsed = createCustomFoodSchema.safeParse({
    name: formData.get("name"),
    brand: formData.get("brand"),
    calories: formData.get("calories"),
    proteinG: formData.get("proteinG"),
    fatG: formData.get("fatG"),
    carbsG: formData.get("carbsG"),
    fiberG: formData.get("fiberG"),
    sugarG: formData.get("sugarG"),
    sodiumMg: formData.get("sodiumMg"),
    servingSize: formData.get("servingSize"),
    servingUnit: formData.get("servingUnit"),
    weightG: formData.get("weightG"),
    defaultMealType: formData.get("defaultMealType"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();
  const data = parsed.data;

  const { data: created, error } = await supabase
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
      serving_size: data.servingSize,
      serving_unit: data.servingUnit,
      weight_g: data.weightG ?? null,
      default_meal_type: data.defaultMealType ?? null,
      source: "custom",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !created) {
    return { error: error?.message ?? "Couldn't save that food" };
  }

  revalidateNutrition();
  return { data: { id: created.id } };
}

export async function toggleFavoriteFood(foodId: string): Promise<ActionResult<{ isFavorite: boolean }>> {
  const { supabase, user } = await requireUser();

  const { data: existing } = await supabase
    .from("user_favorite_foods")
    .select("food_id")
    .eq("user_id", user.id)
    .eq("food_id", foodId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("user_favorite_foods")
      .delete()
      .eq("user_id", user.id)
      .eq("food_id", foodId);
    if (error) return { error: error.message };
    revalidateNutrition();
    return { data: { isFavorite: false } };
  }

  const { error } = await supabase
    .from("user_favorite_foods")
    .insert({ user_id: user.id, food_id: foodId });
  if (error) return { error: error.message };
  revalidateNutrition();
  return { data: { isFavorite: true } };
}

export async function getFavoriteFoods(): Promise<ActionResult<Tables<"foods">[]>> {
  const { supabase, user } = await requireUser();

  const { data: favorites, error } = await supabase
    .from("user_favorite_foods")
    .select("food_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };

  const foodIds = (favorites ?? []).map((f) => f.food_id);
  if (foodIds.length === 0) return { data: [] };

  const { data: foods, error: foodsError } = await supabase
    .from("foods")
    .select("*")
    .in("id", foodIds);

  if (foodsError) return { error: foodsError.message };

  const order = new Map(foodIds.map((id, i) => [id, i]));
  const sorted = [...(foods ?? [])].sort(
    (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
  );
  return { data: sorted };
}

export async function getRecentFoods(limit = 12): Promise<ActionResult<Tables<"foods">[]>> {
  const { supabase, user } = await requireUser();

  const { data: logs, error } = await supabase
    .from("food_logs")
    .select("food_id, logged_at")
    .eq("user_id", user.id)
    .not("food_id", "is", null)
    .order("logged_at", { ascending: false })
    .limit(60);

  if (error) return { error: error.message };

  const seen = new Set<string>();
  const orderedIds: string[] = [];
  for (const log of logs ?? []) {
    if (!log.food_id || seen.has(log.food_id)) continue;
    seen.add(log.food_id);
    orderedIds.push(log.food_id);
    if (orderedIds.length >= limit) break;
  }

  if (orderedIds.length === 0) return { data: [] };

  const { data: foods, error: foodsError } = await supabase
    .from("foods")
    .select("*")
    .in("id", orderedIds);

  if (foodsError) return { error: foodsError.message };

  const order = new Map(orderedIds.map((id, i) => [id, i]));
  const sorted = [...(foods ?? [])].sort(
    (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
  );
  return { data: sorted };
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
