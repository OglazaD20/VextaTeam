import { z } from "zod";

export const mealTypeEnum = z.enum(["breakfast", "lunch", "dinner", "snack", "drink"]);

const optionalNonNegative = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? 0 : v),
  z.coerce.number().min(0),
);

export const logFoodSchema = z.object({
  foodId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(140),
  mealType: mealTypeEnum,
  quantity: z.coerce.number().positive().max(100),
  baseCalories: z.coerce.number().min(0),
  baseProteinG: z.coerce.number().min(0),
  baseFatG: z.coerce.number().min(0),
  baseCarbsG: z.coerce.number().min(0),
  baseFiberG: z.coerce.number().min(0),
  baseSugarG: optionalNonNegative,
  baseSodiumMg: optionalNonNegative,
  notes: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().trim().max(280).optional(),
  ),
});
export type LogFoodInput = z.infer<typeof logFoodSchema>;

export const updateFoodLogSchema = z.object({
  quantity: z.coerce.number().positive().max(100),
  mealType: mealTypeEnum,
  notes: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().trim().max(280).optional(),
  ),
});
export type UpdateFoodLogInput = z.infer<typeof updateFoodLogSchema>;

/**
 * Simplified "quick add" for a food you're entering yourself — the European
 * label convention of stating nutrition per 100 g/ml (rather than an
 * arbitrary named serving) doubles as the simplification: only name,
 * calories, and how much you ate are required, everything else defaults to
 * zero. Creating the food and logging it as eaten today happen in one step.
 */
export const quickAddFoodSchema = z.object({
  name: z.string().trim().min(1).max(140),
  brand: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().trim().max(140).optional(),
  ),
  mealType: mealTypeEnum,
  basis: z.enum(["per100g", "portion"]).default("per100g"),
  amount: z.coerce.number().positive().max(5000),
  calories: z.coerce.number().min(0),
  proteinG: optionalNonNegative,
  fatG: optionalNonNegative,
  carbsG: optionalNonNegative,
  fiberG: optionalNonNegative,
  sugarG: optionalNonNegative,
  sodiumMg: optionalNonNegative,
});
export type QuickAddFoodInput = z.infer<typeof quickAddFoodSchema>;

export const logWaterSchema = z.object({
  amountMl: z.coerce.number().int().positive().max(5000),
});

export const logWeightSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  weightKg: z.coerce.number().positive().max(500),
});

export const updateNutritionGoalsSchema = z.object({
  dailyCalorieGoal: z.coerce.number().positive(),
  proteinGoalG: z.coerce.number().min(0),
  carbsGoalG: z.coerce.number().min(0),
  fatGoalG: z.coerce.number().min(0),
  fiberGoalG: z.coerce.number().min(0),
  waterGoalMl: z.coerce.number().positive(),
  heightCm: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().positive().optional(),
  ),
});
export type UpdateNutritionGoalsInput = z.infer<typeof updateNutritionGoalsSchema>;

export const recipeIngredientSchema = z.object({
  foodId: z.string().uuid(),
  quantity: z.coerce.number().positive().max(100),
});

export const createRecipeSchema = z.object({
  name: z.string().trim().min(1).max(140),
  servings: z.coerce.number().positive().max(50).default(1),
  defaultMealType: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    mealTypeEnum.optional(),
  ),
  ingredients: z.array(recipeIngredientSchema).min(1).max(30),
});
export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;

export const saveMealTemplateSchema = z.object({
  name: z.string().trim().min(1).max(140),
  mealType: mealTypeEnum.optional(),
  items: z
    .array(
      z.object({
        foodId: z.string().uuid(),
        quantity: z.coerce.number().positive().max(100),
      }),
    )
    .min(1)
    .max(30),
});
export type SaveMealTemplateInput = z.infer<typeof saveMealTemplateSchema>;
