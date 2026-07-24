import { env } from "@/lib/env";

const USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";

const NUTRIENT_NAMES = {
  calories: "Energy",
  protein_g: "Protein",
  fat_g: "Total lipid (fat)",
  carbs_g: "Carbohydrate, by difference",
  fiber_g: "Fiber, total dietary",
  sugar_g: "Sugars, total including NLEA",
  sodium_mg: "Sodium, Na",
} as const;

interface UsdaNutrient {
  nutrientName: string;
  value: number;
  unitName: string;
}

interface UsdaFoodItem {
  fdcId: number;
  description: string;
  brandOwner?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients: UsdaNutrient[];
}

export interface UsdaFoodResult {
  externalId: string;
  name: string;
  brand: string | null;
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
  servingSize: number;
  servingUnit: string;
}

function extractNutrient(nutrients: UsdaNutrient[], name: string): number {
  const match = nutrients.find((n) => n.nutrientName === name);
  return match ? Math.round(match.value * 10) / 10 : 0;
}

function mapFoodItem(item: UsdaFoodItem): UsdaFoodResult {
  return {
    externalId: String(item.fdcId),
    name: item.description,
    brand: item.brandOwner ?? null,
    calories: extractNutrient(item.foodNutrients, NUTRIENT_NAMES.calories),
    proteinG: extractNutrient(item.foodNutrients, NUTRIENT_NAMES.protein_g),
    fatG: extractNutrient(item.foodNutrients, NUTRIENT_NAMES.fat_g),
    carbsG: extractNutrient(item.foodNutrients, NUTRIENT_NAMES.carbs_g),
    fiberG: extractNutrient(item.foodNutrients, NUTRIENT_NAMES.fiber_g),
    sugarG: extractNutrient(item.foodNutrients, NUTRIENT_NAMES.sugar_g),
    sodiumMg: extractNutrient(item.foodNutrients, NUTRIENT_NAMES.sodium_mg),
    servingSize: item.servingSize && item.servingSize > 0 ? item.servingSize : 100,
    servingUnit: item.servingSizeUnit ?? "g",
  };
}

export async function searchUsdaFoods(query: string, pageSize = 15): Promise<UsdaFoodResult[]> {
  if (!env.USDA_FDC_API_KEY) {
    throw new Error("USDA_FDC_API_KEY is not set. Food search is unavailable until it's configured.");
  }

  const url = new URL(USDA_SEARCH_URL);
  url.searchParams.set("api_key", env.USDA_FDC_API_KEY);
  url.searchParams.set("query", query);
  url.searchParams.set("pageSize", String(pageSize));
  url.searchParams.set("dataType", "Foundation,SR Legacy,Branded");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`USDA search failed with status ${response.status}`);
  }

  const data: { foods?: UsdaFoodItem[] } = await response.json();
  return (data.foods ?? []).map(mapFoodItem);
}
