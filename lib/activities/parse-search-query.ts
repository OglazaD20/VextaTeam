import { z } from "zod";

import { AI_MODEL_FAST, getOpenAIClient } from "@/lib/ai/client";
import { ACTIVITY_CATEGORIES, type ActivityCategory } from "./category-taxonomy";

const CATEGORY_KEYS = Object.keys(ACTIVITY_CATEGORIES) as [ActivityCategory, ...ActivityCategory[]];

export interface ParsedSearchQuery {
  categories: ActivityCategory[];
  budget: "free" | "low" | "medium" | "high" | null;
  openOnly: boolean;
  minRating: number | null;
  availableMinutes: number | null;
}

const parsedSchema = z.object({
  categories: z.array(z.enum(CATEGORY_KEYS)).max(5),
  budget: z.enum(["free", "low", "medium", "high"]).nullable(),
  openOnly: z.boolean(),
  minRating: z.number().min(1).max(5).nullable(),
  availableMinutes: z.number().int().min(10).max(480).nullable(),
});

/**
 * Turns a free-text query like "Good gym under €20" or "Quiet coffee shop
 * for studying" into structured Discover filters — every field is only set
 * when the query genuinely implies it (never invented), so an ambiguous
 * query just leaves fields null/empty rather than guessing. The query text
 * itself is passed through unchanged as intentNote (see discover.ts) so
 * nuance like "quiet" or "romantic" still reaches the final ranking step.
 */
export async function parseSearchQuery(query: string): Promise<ParsedSearchQuery> {
  const fallback: ParsedSearchQuery = {
    categories: [],
    budget: null,
    openOnly: false,
    minRating: null,
    availableMinutes: null,
  };

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: AI_MODEL_FAST,
      messages: [
        {
          role: "system",
          content:
            "Parse a natural-language activity search into structured filters. categories: 0-5 " +
            "best-matching category keys from the fixed list (empty if the query has no real category " +
            "signal — never guess one). budget: only set from an explicit price signal (a stated amount, " +
            "\"free\", \"cheap\", \"fancy\"/\"upscale\" etc.) — otherwise null. openOnly: true only if the " +
            "query explicitly implies right now / currently open. minRating: only set from words like " +
            "\"best\", \"top-rated\", \"good\" (use 4) — otherwise null, never invent a threshold. " +
            "availableMinutes: only set if a duration is stated or clearly implied (e.g. \"for two hours\" " +
            "= 120) — otherwise null. Never invent a constraint the query doesn't genuinely support.",
        },
        {
          role: "user",
          content: JSON.stringify({ categories: CATEGORY_KEYS, query }),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "parsed_search_query",
          strict: true,
          schema: {
            type: "object",
            properties: {
              categories: { type: "array", items: { type: "string", enum: CATEGORY_KEYS }, maxItems: 5 },
              budget: { type: ["string", "null"], enum: ["free", "low", "medium", "high", null] },
              openOnly: { type: "boolean" },
              minRating: { type: ["number", "null"], minimum: 1, maximum: 5 },
              availableMinutes: { type: ["integer", "null"], minimum: 10, maximum: 480 },
            },
            required: ["categories", "budget", "openOnly", "minRating", "availableMinutes"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return fallback;

    return parsedSchema.parse(JSON.parse(content));
  } catch {
    return fallback;
  }
}
