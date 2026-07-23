import { z } from "zod";

import { AI_MODEL_FAST, getOpenAIClient } from "./client";
import { languageInstruction } from "./language";
import type { Locale } from "@/lib/i18n/locales";

export type PredictionCategory = "goal" | "health" | "habit" | "finance" | "productivity";

export interface PredictionSignalInput {
  category: PredictionCategory;
  /** Already computed deterministically (lib/predict/signals.ts) — the AI never touches this. */
  confidencePct: number;
  relatedEntityType?: string;
  relatedEntityId?: string;
  /** The real numbers behind this signal, given to the AI as grounding context only. */
  data: Record<string, unknown>;
}

export interface PredictionResult {
  category: PredictionCategory;
  confidencePct: number;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  prediction: string;
  reasoning: string;
  recommendation: string;
}

const responseSchema = z.object({
  items: z.array(
    z.object({
      index: z.number().int().min(0),
      prediction: z.string().max(220),
      reasoning: z.string().max(260),
      recommendation: z.string().max(220),
    }),
  ),
});

/**
 * Phrases natural-language predictions strictly from precomputed signals
 * (lib/predict/signals.ts) — same "never invent a number" principle as the
 * AI Coach. confidencePct is computed in code and passed straight through
 * to the UI; the model only ever writes the three text fields per signal.
 */
export async function generatePredictions(
  signals: PredictionSignalInput[],
  locale: Locale,
): Promise<PredictionResult[]> {
  if (signals.length === 0) return [];

  const openai = getOpenAIClient();

  const response = await openai.chat.completions.create({
    model: AI_MODEL_FAST,
    messages: [
      {
        role: "system",
        content: [
          "You are AI Predict inside a life-planning app. You are given precomputed forecast signals —",
          "each one already includes real numbers (progress percentages, rates, projected amounts) derived",
          "from the user's own logged data. For each signal, write exactly three things: a short, direct",
          "prediction sentence stating the likely outcome (style: \"You have a strong chance of finishing",
          "this goal on time.\" \"At your current rate you'll likely lose about 3kg over the next 8 weeks.\"",
          "\"You're on track to miss your reading goal this month.\" \"You usually skip workouts on",
          "Thursdays.\" \"You're likely to go over your food budget this month.\"), one sentence of reasoning",
          "referencing the actual numbers given (never invent a number not present in the signal's data —",
          "and never state a confidence percentage yourself, that's handled separately), and one short,",
          "concrete, actionable recommendation to improve the outcome. Keep every sentence natural and",
          "human, not robotic. Reference each signal by its index.",
          languageInstruction(locale),
        ].join(" "),
      },
      {
        role: "user",
        content: JSON.stringify({
          signals: signals.map((s, index) => ({ index, category: s.category, ...s.data })),
        }),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "predictions",
        strict: true,
        schema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  index: { type: "integer", minimum: 0 },
                  prediction: { type: "string" },
                  reasoning: { type: "string" },
                  recommendation: { type: "string" },
                },
                required: ["index", "prediction", "reasoning", "recommendation"],
                additionalProperties: false,
              },
            },
          },
          required: ["items"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("AI Predict returned an empty response");
  }

  const parsed = responseSchema.parse(JSON.parse(content));

  return parsed.items
    .filter((item) => item.index >= 0 && item.index < signals.length)
    .map((item) => {
      const signal = signals[item.index];
      return {
        category: signal.category,
        confidencePct: signal.confidencePct,
        relatedEntityType: signal.relatedEntityType ?? null,
        relatedEntityId: signal.relatedEntityId ?? null,
        prediction: item.prediction,
        reasoning: item.reasoning,
        recommendation: item.recommendation,
      };
    });
}
