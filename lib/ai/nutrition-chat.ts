import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import { AI_MODEL_CHAT, getOpenAIClient } from "@/lib/ai/client";
import type { ToolContext } from "@/lib/ai/chat-tools";
import { executeNutritionTool, NUTRITION_CHAT_TOOLS, type NutritionChatSummary } from "@/lib/ai/nutrition-chat-tools";
import { languageInstruction } from "@/lib/ai/language";
import type { Locale } from "@/lib/i18n/locales";

const MAX_TOOL_ITERATIONS = 4;

function systemPrompt(locale: Locale): string {
  return [
    "You are the Nutrition Chat inside LifeFlow, a friendly food and nutrition assistant. You help with",
    "questions like calorie/macro lookups, meal ideas, meal plans, and general nutrition education, and you",
    "help log food the user says they ate.",
    "Never state a specific food's calories or macros from memory — always call search_food first (for a",
    "single lookup or a 'which is healthier' comparison) or log_food_items (when the user describes food",
    "they ate, e.g. 'I had two apples and 150g of chicken breast'). Report exactly the numbers those tools",
    "return, never adjust or round differently than given.",
    "For broader questions ('what should I eat after training?', 'create a 2500 kcal meal plan', 'I want to",
    "lose weight', 'I want to gain muscle') you can answer directly from general nutrition knowledge as",
    "advice/suggestions — these don't need a tool call since they're not a claim about one specific food's",
    "measured nutrition. Use get_today_nutrition_summary and get_nutrition_goals to ground advice about how",
    "much the user has left to eat today.",
    "Keep replies short and conversational — a few sentences, plain language, explain concepts simply.",
    "When you call log_food_items, your reply should summarize what was logged in one sentence; the app",
    "shows the exact numbers in a card below your message, so don't repeat every macro in a list.",
    languageInstruction(locale),
  ].join(" ");
}

export interface NutritionChatResult {
  reply: string;
  foodSummary: NutritionChatSummary | null;
}

export async function runNutritionChatTurn(
  ctx: ToolContext,
  history: ChatCompletionMessageParam[],
): Promise<NutritionChatResult> {
  const openai = getOpenAIClient();
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt(ctx.locale) },
    ...history,
  ];

  let foodSummary: NutritionChatSummary | null = null;

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await openai.chat.completions.create({
      model: AI_MODEL_CHAT,
      messages,
      tools: NUTRITION_CHAT_TOOLS,
    });

    const message = response.choices[0]?.message;
    if (!message) {
      throw new Error("The nutrition assistant returned no response");
    }
    messages.push(message);

    if (!message.tool_calls || message.tool_calls.length === 0) {
      return { reply: message.content ?? "", foodSummary };
    }

    for (const toolCall of message.tool_calls) {
      if (toolCall.type !== "function") continue;

      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(toolCall.function.arguments || "{}");
      } catch {
        // Leave args empty; the tool will just see defaults.
      }

      const result = await executeNutritionTool(ctx, toolCall.function.name, args);
      if (toolCall.function.name === "log_food_items") {
        foodSummary = result as NutritionChatSummary;
      }

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
  }

  throw new Error("The nutrition assistant took too many steps — try rephrasing.");
}
