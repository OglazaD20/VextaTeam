import type { ChatCompletionTool } from "openai/resources/chat/completions";

import { getNutritionSummary, type ToolContext } from "@/lib/ai/chat-tools";
import { searchFoods, type FoodSearchResult } from "@/lib/nutrition/food-search";
import { computeServingMultiplier } from "@/lib/nutrition/quantity";
import { scaleMacros, sumMacros, type Macros } from "@/lib/nutrition/macros";

export const NUTRITION_CHAT_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_food",
      description:
        "Look up a food's real nutrition facts (calories, protein, fat, carbs) per serving. Always call this before stating a specific food's numbers — never state a calorie/macro figure from memory.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "The food name, e.g. 'banana' or 'chicken breast'." } },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_today_nutrition_summary",
      description: "Get what the user has already eaten today (calories/macros) and how much is left toward their daily goal.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_nutrition_goals",
      description: "Get the user's daily calorie and macro (protein/carbs/fat) targets.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "log_food_items",
      description:
        "Compute real nutrition totals for food items the user says they ate (e.g. 'two apples and 150g of chicken breast'). " +
        "Give one entry per distinct food. Set exactly one of quantityGrams or quantityServings per item — quantityGrams for " +
        "a weight/volume amount ('150g', '200ml'), quantityServings for a count (e.g. 'two apples' -> quantityServings: 2). " +
        "This returns the real computed totals — always report exactly the numbers it returns, never adjust them.",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                query: { type: "string", description: "The food name to look up." },
                quantityGrams: { type: ["number", "null"] },
                quantityServings: { type: ["number", "null"] },
              },
              required: ["query", "quantityGrams", "quantityServings"],
              additionalProperties: false,
            },
          },
        },
        required: ["items"],
        additionalProperties: false,
      },
    },
  },
];

export interface LoggedFoodItem {
  query: string;
  matched: FoodSearchResult | null;
  quantityGrams: number | null;
  quantityServings: number | null;
  servingMultiplier: number;
  macros: Macros | null;
}

export interface NutritionChatSummary {
  items: LoggedFoodItem[];
  totals: Macros;
}

async function searchFood(ctx: ToolContext, args: { query: string }) {
  const results = await searchFoods(ctx.supabase, ctx.userId, args.query);
  return { results: results.slice(0, 5) };
}

async function getNutritionGoals(ctx: ToolContext) {
  const { data } = await ctx.supabase
    .from("nutrition_settings")
    .select("daily_calorie_goal, protein_goal_g, carbs_goal_g, fat_goal_g, fiber_goal_g")
    .eq("user_id", ctx.userId)
    .maybeSingle();

  return {
    calorieGoal: data?.daily_calorie_goal ?? 2000,
    proteinGoalG: data?.protein_goal_g ?? 120,
    carbsGoalG: data?.carbs_goal_g ?? 250,
    fatGoalG: data?.fat_goal_g ?? 65,
    fiberGoalG: data?.fiber_goal_g ?? 30,
  };
}

export async function logFoodItems(
  ctx: ToolContext,
  args: { items: { query: string; quantityGrams: number | null; quantityServings: number | null }[] },
): Promise<NutritionChatSummary> {
  const items: LoggedFoodItem[] = [];

  for (const item of args.items) {
    const results = await searchFoods(ctx.supabase, ctx.userId, item.query);
    const matched = results[0] ?? null;

    if (!matched) {
      items.push({
        query: item.query,
        matched: null,
        quantityGrams: item.quantityGrams,
        quantityServings: item.quantityServings,
        servingMultiplier: 0,
        macros: null,
      });
      continue;
    }

    const servingMultiplier = computeServingMultiplier(
      item.quantityGrams,
      item.quantityServings,
      matched.serving_size,
      matched.serving_unit,
    );

    const macros = scaleMacros(
      {
        calories: matched.calories,
        proteinG: matched.protein_g,
        fatG: matched.fat_g,
        carbsG: matched.carbs_g,
        fiberG: matched.fiber_g,
        sugarG: matched.sugar_g,
        sodiumMg: matched.sodium_mg,
      },
      servingMultiplier,
    );

    items.push({
      query: item.query,
      matched,
      quantityGrams: item.quantityGrams,
      quantityServings: item.quantityServings,
      servingMultiplier,
      macros,
    });
  }

  const totals = sumMacros(items.map((i) => i.macros).filter((m): m is Macros => m !== null));

  return { items, totals };
}

export async function executeNutritionTool(
  ctx: ToolContext,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case "search_food":
      return searchFood(ctx, args as { query: string });
    case "get_today_nutrition_summary":
      return getNutritionSummary(ctx);
    case "get_nutrition_goals":
      return getNutritionGoals(ctx);
    case "log_food_items":
      return logFoodItems(
        ctx,
        args as { items: { query: string; quantityGrams: number | null; quantityServings: number | null }[] },
      );
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
