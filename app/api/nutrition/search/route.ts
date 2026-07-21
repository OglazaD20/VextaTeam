import { NextResponse } from "next/server";

import { searchUsdaFoods } from "@/lib/nutrition/usda-client";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 });
  }

  const { data: customMatches } = await supabase
    .from("foods")
    .select("*")
    .in("source", ["custom", "recipe"])
    .eq("created_by", user.id)
    .ilike("name", `%${query}%`)
    .limit(10);

  let usdaResults: Awaited<ReturnType<typeof searchUsdaFoods>> = [];
  try {
    usdaResults = await searchUsdaFoods(query);
  } catch (error) {
    // Custom foods/recipes still work even if the USDA lookup is unavailable/misconfigured.
    if (!customMatches || customMatches.length === 0) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Food search failed" },
        { status: 502 },
      );
    }
  }

  let cachedUsdaFoods: { id: string; external_id: string | null }[] = [];
  if (usdaResults.length > 0) {
    const { data: upserted, error: upsertError } = await supabase
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

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }
    cachedUsdaFoods = upserted ?? [];
  }

  const idByExternalId = new Map(cachedUsdaFoods.map((f) => [f.external_id, f.id]));

  const results = [
    ...(customMatches ?? []),
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
      source: "usda" as const,
    })),
  ];

  return NextResponse.json({ data: results });
}
