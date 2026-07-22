import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import { AI_MODEL_CHAT, getOpenAIClient } from "@/lib/ai/client";
import type { ToolContext } from "@/lib/ai/chat-tools";
import { executeNutritionTool, NUTRITION_CHAT_TOOLS, type NutritionChatSummary } from "@/lib/ai/nutrition-chat-tools";
import { languageInstruction } from "@/lib/ai/language";
import type { Locale } from "@/lib/i18n/locales";

const MAX_TOOL_ITERATIONS = 4;

function systemPrompt(locale: Locale): string {
  return [
    "You are the Nutrition Chat inside LifeFlow, a friendly food and nutrition assistant. There is no food",
    "database — you estimate calories and macros yourself from general nutrition knowledge, the way an",
    "experienced nutritionist would, accounting for typical preparation and portion size. Be direct with a",
    "specific number rather than a vague range whenever you can.",
    "Whenever you give a calorie/macro estimate for something the user might have actually eaten (not a",
    "hypothetical, not a 'what if' question), always end that reply by asking whether they ate it, e.g. 'Did",
    "you eat this?' or 'Want me to add this to today?'. If the user describes food in the past tense",
    "('I ate two eggs', 'I had a bowl of oatmeal with blueberries') that already implies yes — estimate the",
    "nutrition and immediately call log_food_items with your estimate, no need to ask first.",
    "Once the user confirms (a plain 'yes', 'yeah', 'add it', etc. right after you asked), call log_food_items",
    "with the same numbers you already estimated — never silently change them between the estimate and the log.",
    "For broader questions ('what should I eat after training?', 'create a 2500 kcal meal plan', 'I want to",
    "lose weight', 'I want to gain muscle') answer directly from general nutrition knowledge as advice — these",
    "don't need logging since they're not about something specific the user ate. Use get_today_nutrition_summary",
    "and get_nutrition_goals to ground advice about how much the user has left to eat today.",
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
