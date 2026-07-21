import { z } from "zod";

import { AI_MODEL_FAST, getOpenAIClient } from "./client";
import type { PlacementFact } from "@/lib/scheduling/reasoning";
import type { WeatherSnapshot } from "@/lib/activities/weather-client";

const reasoningResponseSchema = z.object({
  itemReasoning: z.array(z.object({ id: z.string(), reasoning: z.string().max(140) })),
  daySummary: z.string().max(280),
});

export type PlanReasoningResult = z.infer<typeof reasoningResponseSchema>;

export interface PlanReasoningInput {
  notableFacts: PlacementFact[];
  bumpedTitles: string[];
  weather: WeatherSnapshot | null;
  /** Last night's sleep, when logged, so the summary can note a lighter/heavier day. */
  lastNightSleep: { hours: number | null; quality: number | null } | null;
}

/**
 * Phrases *why* the deterministic solver placed things where it did, and
 * summarizes an overloaded day — from precomputed facts only. The model
 * never invents times, weather, or bumped items; it only writes the
 * human-readable explanation for facts it's given.
 */
const POOR_SLEEP_HOURS_THRESHOLD = 6;
const POOR_SLEEP_QUALITY_THRESHOLD = 2;

function isNotableSleep(sleep: PlanReasoningInput["lastNightSleep"]): boolean {
  if (!sleep) return false;
  return (
    (sleep.hours !== null && sleep.hours < POOR_SLEEP_HOURS_THRESHOLD) ||
    (sleep.quality !== null && sleep.quality <= POOR_SLEEP_QUALITY_THRESHOLD)
  );
}

export async function generatePlanReasoning(
  input: PlanReasoningInput,
): Promise<PlanReasoningResult> {
  if (
    input.notableFacts.length === 0 &&
    input.bumpedTitles.length === 0 &&
    !isNotableSleep(input.lastNightSleep)
  ) {
    return { itemReasoning: [], daySummary: "" };
  }

  const openai = getOpenAIClient();

  const response = await openai.chat.completions.create({
    model: AI_MODEL_FAST,
    messages: [
      {
        role: "system",
        content: [
          "You explain a daily planner's scheduling decisions in one short, specific sentence per item,",
          "like a helpful executive assistant. Use ONLY the facts given — never invent a time, weather",
          "condition, or reason not present in the input. Examples of tone: \"Scheduled right after your",
          "Team standup ends.\" \"Placed during your usual high-focus morning window.\" \"Kept at your usual",
          "7am running time.\" If bumpedTitles is non-empty, also write a short, reassuring 1-2 sentence",
          "daySummary explaining the day was too full and those items were left unscheduled for a later day.",
          "If lastNightSleep shows short or poor-quality sleep, mention in the daySummary that it's worth",
          "taking it easier today — but never invent a sleep figure that isn't in the input. Return an empty",
          "daySummary only if there is truly nothing worth telling the user.",
        ].join(" "),
      },
      { role: "user", content: JSON.stringify(input) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "plan_reasoning",
        strict: true,
        schema: {
          type: "object",
          properties: {
            itemReasoning: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  reasoning: { type: "string" },
                },
                required: ["id", "reasoning"],
                additionalProperties: false,
              },
            },
            daySummary: { type: "string" },
          },
          required: ["itemReasoning", "daySummary"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("The AI reasoning generator returned an empty response");
  }

  return reasoningResponseSchema.parse(JSON.parse(content));
}
