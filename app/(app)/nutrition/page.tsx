import type { Metadata } from "next";
import { subDays } from "date-fns";

import { getMealTemplates, getUserRecipes } from "@/app/(app)/nutrition/actions";
import { CreateCustomFoodDialog } from "@/components/nutrition/create-custom-food-dialog";
import { GoalsDialog } from "@/components/nutrition/goals-dialog";
import { MacroRing } from "@/components/nutrition/macro-ring";
import { MealSection, type FoodLogEntry } from "@/components/nutrition/meal-section";
import { MealTemplatesSection } from "@/components/nutrition/meal-templates-section";
import { NutritionChatPanel } from "@/components/nutrition/nutrition-chat-panel";
import { RecipesSection } from "@/components/nutrition/recipes-section";
import { WaterTracker } from "@/components/nutrition/water-tracker";
import { WeightChart, type WeightPoint } from "@/components/nutrition/weight-chart";
import { WeightLogForm } from "@/components/nutrition/weight-log-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeBmi, sumMacros } from "@/lib/nutrition/macros";
import { getTodayRangeUtc } from "@/lib/scheduling/day-range";
import { getTodayKey } from "@/lib/habits/today-key";
import { createClient } from "@/lib/supabase/server";
import type { MealType } from "@/types/database";

export const metadata: Metadata = { title: "Nutrition — LifeFlow" };

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack", "drink"];

export default async function NutritionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();
  const timeZone = profile?.timezone ?? "UTC";
  const todayKey = getTodayKey(timeZone);
  const { start, end } = getTodayRangeUtc(timeZone);

  const [
    { data: foodLogs, error: foodLogsError },
    { data: waterLogs, error: waterLogsError },
    { data: settings },
    { data: bodyMetrics },
    templatesResult,
    recipesResult,
  ] = await Promise.all([
    supabase
      .from("food_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("logged_at", start.toISOString())
      .lte("logged_at", end.toISOString())
      .order("logged_at", { ascending: true }),
    supabase
      .from("water_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("logged_at", start.toISOString())
      .lte("logged_at", end.toISOString()),
    supabase.from("nutrition_settings").select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("body_metrics")
      .select("logged_for_date, weight_kg")
      .eq("user_id", user.id)
      .gte("logged_for_date", subDays(new Date(), 29).toISOString().slice(0, 10))
      .order("logged_for_date", { ascending: true }),
    getMealTemplates(),
    getUserRecipes(),
  ]);

  if (foodLogsError) throw new Error(`Failed to load food log: ${foodLogsError.message}`);
  if (waterLogsError) throw new Error(`Failed to load water log: ${waterLogsError.message}`);

  const foodIds = [...new Set((foodLogs ?? []).map((l) => l.food_id).filter(Boolean))] as string[];
  let namesByFoodId = new Map<string, string>();
  if (foodIds.length > 0) {
    const { data: foods } = await supabase.from("foods").select("id, name").in("id", foodIds);
    namesByFoodId = new Map((foods ?? []).map((f) => [f.id, f.name]));
  }

  const entriesByMeal = new Map<MealType, FoodLogEntry[]>();
  for (const log of foodLogs ?? []) {
    const entry: FoodLogEntry = {
      id: log.id,
      foodId: log.food_id,
      name: log.food_id ? (namesByFoodId.get(log.food_id) ?? "Food") : "Food",
      calories: log.calories,
      proteinG: log.protein_g,
      fatG: log.fat_g,
      carbsG: log.carbs_g,
      quantity: log.quantity,
      mealType: log.meal_type,
      notes: log.notes,
    };
    if (!entriesByMeal.has(log.meal_type)) entriesByMeal.set(log.meal_type, []);
    entriesByMeal.get(log.meal_type)!.push(entry);
  }

  const totals = sumMacros(
    (foodLogs ?? []).map((l) => ({
      calories: l.calories,
      proteinG: l.protein_g,
      fatG: l.fat_g,
      carbsG: l.carbs_g,
      fiberG: l.fiber_g,
      sugarG: l.sugar_g,
      sodiumMg: l.sodium_mg,
    })),
  );
  const totalWaterMl = (waterLogs ?? []).reduce((sum, w) => sum + w.amount_ml, 0);

  const weightPoints: WeightPoint[] = (bodyMetrics ?? []).map((m) => ({
    label: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
      new Date(m.logged_for_date),
    ),
    weightKg: m.weight_kg,
  }));
  const latestWeight = [...(bodyMetrics ?? [])].reverse().find((m) => m.weight_kg !== null);
  const bmi = computeBmi(latestWeight?.weight_kg ?? null, settings?.height_cm ?? null);

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Nutrition</h1>
          <p className="text-sm text-muted-foreground">Today&apos;s food and water.</p>
        </div>
        <div className="flex items-center gap-2">
          <CreateCustomFoodDialog />
          <GoalsDialog settings={settings ?? null} />
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <MacroRing
            calories={totals.calories}
            calorieGoal={settings?.daily_calorie_goal ?? 2000}
            proteinG={totals.proteinG}
            proteinGoalG={settings?.protein_goal_g ?? 120}
            carbsG={totals.carbsG}
            carbsGoalG={settings?.carbs_goal_g ?? 250}
            fatG={totals.fatG}
            fatGoalG={settings?.fat_goal_g ?? 65}
          />
          <p className="text-center text-xs text-muted-foreground">
            {Math.round(totals.sugarG)}g sugar · {Math.round(totals.sodiumMg)}mg sodium
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <WaterTracker totalMl={totalWaterMl} goalMl={settings?.water_goal_ml ?? 2000} />
        </CardContent>
      </Card>

      <NutritionChatPanel />

      <div className="flex flex-col gap-3">
        {MEAL_TYPES.map((mealType) => (
          <MealSection
            key={mealType}
            mealType={mealType}
            entries={entriesByMeal.get(mealType) ?? []}
          />
        ))}
      </div>

      <MealTemplatesSection templates={templatesResult.data ?? []} />
      <RecipesSection initialRecipes={recipesResult.data ?? []} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Weight</CardTitle>
          <div className="flex items-center gap-3">
            {bmi !== null && (
              <span className="text-xs text-muted-foreground">BMI {bmi}</span>
            )}
            <WeightLogForm todayKey={todayKey} latestKg={latestWeight?.weight_kg ?? null} />
          </div>
        </CardHeader>
        <CardContent>
          <WeightChart data={weightPoints} />
        </CardContent>
      </Card>
    </div>
  );
}
