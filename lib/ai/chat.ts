import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import { AI_MODEL_CHAT, getOpenAIClient } from "./client";
import { CHAT_TOOLS, executeTool, type ToolContext } from "./chat-tools";

const MAX_TOOL_ITERATIONS = 6;

function systemPrompt(timeZone: string) {
  return [
    "You are LifeFlow's assistant: a calm, concise personal planner built into a daily-planning app.",
    `The user's current local time is ${new Date().toLocaleString("en-US", { timeZone, dateStyle: "full", timeStyle: "short" })} (timezone ${timeZone}).`,
    "You have tools to read and modify the user's real schedule. Never invent item ids, times, or schedule state — call get_schedule or get_free_slots first when you need them.",
    "For bulk rescheduling requests ('move everything after 3pm', 'plan my day'), use replan_day rather than moving items one by one — it re-runs the same scheduling engine the app uses elsewhere, which keeps placements consistent.",
    "When asked to fit something in ('can I fit a gym session today?'), add it with add_task (unscheduled unless a specific time was given) and then call replan_day to place it, then report back the time it landed on.",
    "Keep replies short — 1 to 3 sentences, conversational, no headers or bullet lists unless listing multiple schedule items. When you make a change, briefly say what happened.",
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
