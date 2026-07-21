import { z } from "zod";

export const mealTypeEnum = z.enum(["breakfast", "lunch", "dinner", "snack", "drink"]);

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
  notes: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().trim().max(280).optional(),
  ),
});
export type LogFoodInput = z.infer<typeof logFoodSchema>;

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
