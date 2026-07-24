import { z } from "zod";

import { AI_MODEL_FAST, getOpenAIClient } from "./client";
import { languageInstruction } from "./language";
import type { Locale } from "@/lib/i18n/locales";

const estimateSchema = z.object({
  estimates: z.array(
    z.object({
      id: z.string(),
      estimatedDurationMinutes: z.number().int().min(5).max(480),
      reasoning: z.string().max(140),
    }),
  ),
});

export type DurationEstimate = z.infer<typeof estimateSchema>["estimates"][number];

export interface DurationEstimateRequest {
  id: string;
  title: string;
  type: string;
}

export async function estimateDurations(
  items: DurationEstimateRequest[],
  locale: Locale,
): Promise<DurationEstimate[]> {
  if (items.length === 0) return [];

  const openai = getOpenAIClient();

  const response = await openai.chat.completions.create({
    model: AI_MODEL_FAST,
    messages: [
      {
        role: "system",
        content:
          "You estimate how long tasks realistically take, in minutes, for a daily planner app. Be realistic rather than optimistic — account for typical friction and context-switching. Keep each reasoning to a short clause, under 12 words, written for the task's owner (e.g. \"emails like this usually run long\"). " +
          languageInstruction(locale),
      },
      { role: "user", content: JSON.stringify({ items }) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "duration_estimates",
        strict: true,
        schema: {
          type: "object",
          properties: {
            estimates: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  estimatedDurationMinutes: { type: "integer", minimum: 5, maximum: 480 },
                  reasoning: { type: "string" },
                },
                required: ["id", "estimatedDurationMinutes", "reasoning"],
                additionalProperties: false,
              },
            },
          },
          required: ["estimates"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("The AI estimator returned an empty response");
  }

  return estimateSchema.parse(JSON.parse(content)).estimates;
}
