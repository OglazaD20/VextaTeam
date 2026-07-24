import { z } from "zod";

import { AI_MODEL_FAST, getOpenAIClient } from "./client";
import { languageInstruction } from "./language";
import type { Locale } from "@/lib/i18n/locales";

export const COACHING_CATEGORIES = [
  "productivity",
  "health",
  "mood",
  "finance",
  "goals",
  "habits",
  "nutrition",
  "achievements",
  "general",
] as const;
export type CoachingCategory = (typeof COACHING_CATEGORIES)[number];

const coachingResponseSchema = z.object({
  headline: z.string().max(120),
  insights: z
    .array(
      z.object({
        title: z.string().max(80),
        detail: z.string().max(200),
        category: z.enum(COACHING_CATEGORIES),
      }),
    )
    .max(8),
});

export type CoachingResult = z.infer<typeof coachingResponseSchema>;

export interface CoachingSignals {
  period: "daily" | "weekly" | "monthly";
  [key: string]: unknown;
}

/**
 * Phrases the AI Coach's insights from precomputed statistical signals only
 * (lib/coach/signals.ts) — same principle as habit insights and plan
 * reasoning: the model explains patterns, it never invents a number, streak,
 * or correlation that isn't in the input.
 */
export async function generateCoaching(
  signals: CoachingSignals,
  locale: Locale,
): Promise<CoachingResult> {
  const openai = getOpenAIClient();

  const response = await openai.chat.completions.create({
    model: AI_MODEL_FAST,
    messages: [
      {
        role: "system",
        content: [
          "You are an encouraging, specific personal coach for a daily planner app. You are given",
          "precomputed statistics only — never invent a number, percentage, streak, or correlation not",
          "present in the input. Skip any signal that's null/missing rather than guessing. Write insights",
          "in second person, concrete and personal, in the style of: \"You consistently finish difficult",
          "work before 11 AM.\" \"You perform 27% better after sleeping 8 hours.\" \"You skip workouts every",
          "Wednesday.\" \"You've maintained your reading streak for 22 days.\" If a weather signal is present",
          "(today's conditions and any weather-driven suggestions), you may fold it into one insight — e.g.",
          "suggesting an indoor swap for an outdoor habit if rain is expected — but only when it's genuinely",
          "relevant to the user's patterns, and never state a forecast detail that isn't in the input. Tag",
          `each insight with the single best-fitting category from: ${COACHING_CATEGORIES.join(", ")} — use`,
          "\"general\" only when nothing else fits. Write 2-8 insights, covering as many of the real signal",
          "categories present in the input as you genuinely have something specific to say about (fewer if",
          "there isn't much signal — never pad with generic advice, and never invent a category's insight",
          "when that category has no real signal in the input), and one short headline summarizing the",
          "overall picture for this period.",
          languageInstruction(locale),
        ].join(" "),
      },
      { role: "user", content: JSON.stringify(signals) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "coaching_insights",
        strict: true,
        schema: {
          type: "object",
          properties: {
            headline: { type: "string" },
            insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  detail: { type: "string" },
                  category: { type: "string", enum: COACHING_CATEGORIES },
                },
                required: ["title", "detail", "category"],
                additionalProperties: false,
              },
            },
          },
          required: ["headline", "insights"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("The AI coach returned an empty response");
  }

  return coachingResponseSchema.parse(JSON.parse(content));
}
