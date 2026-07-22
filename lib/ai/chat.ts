import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import { AI_MODEL_CHAT, getOpenAIClient } from "./client";
import { CHAT_TOOLS, executeTool, type ToolContext } from "./chat-tools";

const MAX_TOOL_ITERATIONS = 6;

function systemPrompt(timeZone: string) {
  return [
    "You are LifeFlow's assistant: a calm, concise life assistant built into an all-in-one planning app —",
    "not just a calendar bot. You have tools spanning the whole app: schedule, goals, mood, finance,",
    "nutrition, weather, and semantic search over everything the user has ever saved or logged (memory).",
    `The user's current local time is ${new Date().toLocaleString("en-US", { timeZone, dateStyle: "full", timeStyle: "short" })} (timezone ${timeZone}).`,
    "Never invent an item id, number, or fact — always call the relevant tool first (get_schedule,",
    "get_goals, get_mood_summary, get_finance_summary, get_nutrition_summary, get_weather,",
    "search_memory) before answering anything you don't already have in this conversation.",
    "Broad, cross-cutting questions need multiple tools before you answer, not one: 'what should I do",
    "now?' needs get_schedule + get_free_slots; 'should I cook?' needs get_nutrition_summary (what's",
    "left toward today's goal) plus get_schedule (how much time is free); 'how much can I spend today?'",
    "needs get_finance_summary (budget remaining this month) divided across the days left; 'plan my",
    "perfect Saturday' needs get_weather, get_goals, and get_free_slots together, not just the schedule.",
    "For bulk rescheduling requests ('move everything after 3pm', 'plan my day'), use replan_day rather",
    "than moving items one by one — it re-runs the same scheduling engine the app uses elsewhere, which",
    "keeps placements consistent.",
    "When asked to fit something in ('can I fit a gym session today?'), add it with add_task (unscheduled",
    "unless a specific time was given) and then call replan_day to place it, then report back the time",
    "it landed on.",
    "If the user mentions how they're feeling ('feeling great today', 'pretty stressed'), log it with",
    "log_mood rather than just acknowledging it in text.",
    "For 'what did I...', 'when did I...', or 'what was that place/gift/thing I saved' questions, use",
    "search_memory — never guess from general knowledge about something specific to this user's history.",
    "Keep replies short — 1 to 3 sentences, conversational, no headers or bullet lists unless listing",
    "multiple items. When you make a change, briefly say what happened.",
  ].join(" ");
}

export async function runChatTurn(
  ctx: ToolContext,
  history: ChatCompletionMessageParam[],
): Promise<string> {
  const openai = getOpenAIClient();
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt(ctx.timeZone) },
    ...history,
  ];

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await openai.chat.completions.create({
      model: AI_MODEL_CHAT,
      messages,
      tools: CHAT_TOOLS,
    });

    const message = response.choices[0]?.message;
    if (!message) {
      throw new Error("The assistant returned no response");
    }
    messages.push(message);

    if (!message.tool_calls || message.tool_calls.length === 0) {
      return message.content ?? "";
    }

    for (const toolCall of message.tool_calls) {
      if (toolCall.type !== "function") continue;

      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(toolCall.function.arguments || "{}");
      } catch {
        // Leave args empty; the tool will just see defaults.
      }

      const result = await executeTool(ctx, toolCall.function.name, args);
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
  }

  throw new Error("The assistant took too many steps without finishing — try rephrasing.");
}
