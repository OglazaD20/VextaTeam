import { searchUsdaFoods } from "@/lib/nutrition/usda-client";
import type { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface FoodSearchResult {
  id: string;
  name: string;
  brand: string | null;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  serving_size: number;
  serving_unit: string;
}

function fromRow(row: Tables<"foods">): FoodSearchResult {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    calories: row.calories,
    protein_g: row.protein_g,
    fat_g: row.fat_g,
    carbs_g: row.carbs_g,
    fiber_g: row.fiber_g,
    sugar_g: row.sugar_g,
    sodium_mg: row.sodium_mg,
    serving_size: row.serving_size,
    serving_unit: row.serving_unit,
  };
}

/**
 * Food lookup used by app/api/nutrition/search — now only for picking
 * ingredients when building a saved recipe. Everyday food logging goes
 * through the AI Nutrition Chat's own estimate instead of this lookup.
 */
export async function searchFoods(
  supabase: SupabaseServerClient,
  userId: string,
  query: string,
): Promise<FoodSearchResult[]> {
  const { data: customMatches } = await supabase
    .from("foods")
    .select("*")
    .in("source", ["custom", "recipe"])
    .eq("created_by", userId)
    .ilike("name", `%${query}%`)
    .limit(10);

  let usdaResults: Awaited<ReturnType<typeof searchUsdaFoods>> = [];
  try {
    usdaResults = await searchUsdaFoods(query);
  } catch {
    // Custom foods still work even if the USDA lookup is unavailable/misconfigured.
  }

  let cachedUsdaFoods: { id: string; external_id: string | null }[] = [];
  if (usdaResults.length > 0) {
    const { data: upserted } = await supabase
      .from("foods")
      .upsert(
        usdaResults.map((food) => ({
          name: food.name,
          brand: food.brand,
          calories: food.calories,
          protein_g: food.proteinG,
          fat_g: food.fatG,
          carbs_g: food.carbsG,
          fiber_g: food.fiberG,
          sugar_g: food.sugarG,
          sodium_mg: food.sodiumMg,
          serving_size: food.servingSize,
          serving_unit: food.servingUnit,
          source: "usda" as const,
          external_id: food.externalId,
        })),
        { onConflict: "source,external_id" },
      )
      .select("id, external_id");
    cachedUsdaFoods = upserted ?? [];
  }

  const idByExternalId = new Map(cachedUsdaFoods.map((f) => [f.external_id, f.id]));

  return [
    ...(customMatches ?? []).map(fromRow),
    ...usdaResults.map((food) => ({
      id: idByExternalId.get(food.externalId) ?? food.externalId,
      name: food.name,
      brand: food.brand,
      calories: food.calories,
      protein_g: food.proteinG,
      fat_g: food.fatG,
      carbs_g: food.carbsG,
      fiber_g: food.fiberG,
      sugar_g: food.sugarG,
      sodium_mg: food.sodiumMg,
      serving_size: food.servingSize,
      serving_unit: food.servingUnit,
    })),
  ];
}
