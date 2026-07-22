import type { ChatCompletionTool } from "openai/resources/chat/completions";

import { getNutritionSummary, type ToolContext } from "@/lib/ai/chat-tools";
import { sumMacros, type Macros } from "@/lib/nutrition/macros";

export const NUTRITION_CHAT_TOOLS: ChatCompletionTool[] = [
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
        "Log food items the user has confirmed they ate (e.g. they answered yes to 'did you eat this?', or " +
        "clearly stated it in the past tense — 'I ate two eggs'). Use your own best nutrition estimate for each " +
        "item — there is no database to look up, estimate the way a knowledgeable nutritionist would from the " +
        "food and quantity described, accounting for typical preparation. Report exactly the numbers you pass " +
        "here back to the user; they are logged as-is, never recomputed.",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Short food name, e.g. 'Scrambled eggs'." },
                quantityDescription: {
                  type: "string",
                  description: "The amount eaten, in the user's own terms, e.g. '2 large eggs' or '250g grilled chicken breast'.",
                },
                calories: { type: "number", minimum: 0 },
                proteinG: { type: "number", minimum: 0 },
                carbsG: { type: "number", minimum: 0 },
                fatG: { type: "number", minimum: 0 },
                fiberG: { type: "number", minimum: 0 },
              },
              required: ["name", "quantityDescription", "calories", "proteinG", "carbsG", "fatG", "fiberG"],
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
  name: string;
  quantityDescription: string;
  macros: Macros;
}

export interface NutritionChatSummary {
  items: LoggedFoodItem[];
  totals: Macros;
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

interface LogFoodItemsArgs {
  items: {
    name: string;
    quantityDescription: string;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
  }[];
}

export async function logFoodItems(args: LogFoodItemsArgs): Promise<NutritionChatSummary> {
  const items: LoggedFoodItem[] = args.items.map((item) => ({
    name: item.name,
    quantityDescription: item.quantityDescription,
    macros: {
      calories: item.calories,
      proteinG: item.proteinG,
      carbsG: item.carbsG,
      fatG: item.fatG,
      fiberG: item.fiberG,
      sugarG: 0,
      sodiumMg: 0,
    },
  }));

  const totals = sumMacros(items.map((i) => i.macros));

  return { items, totals };
}

export async function executeNutritionTool(
  ctx: ToolContext,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case "get_today_nutrition_summary":
      return getNutritionSummary(ctx);
    case "get_nutrition_goals":
      return getNutritionGoals(ctx);
    case "log_food_items":
      return logFoodItems(args as unknown as LogFoodItemsArgs);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
