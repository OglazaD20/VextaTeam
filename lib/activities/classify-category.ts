import { z } from "zod";

import { AI_MODEL_FAST, getOpenAIClient } from "@/lib/ai/client";
import { ACTIVITY_CATEGORIES, type ActivityCategory } from "./category-taxonomy";
import type { MergedPlace } from "./providers/merge-places";

const CATEGORY_KEYS = Object.keys(ACTIVITY_CATEGORIES) as [ActivityCategory, ...ActivityCategory[]];

const classificationSchema = z.object({
  classifications: z.array(
    z.object({
      index: z.number().int().min(0),
      category: z.enum(CATEGORY_KEYS),
    }),
  ),
});

/**
 * Places where deterministic tag matching couldn't confidently place a real
 * provider tag into our taxonomy (categoryConfidence: "low") fall back to an
 * AI classifier here — it only ever sees the place's real name/address and
 * picks the closest fit from the fixed category enum. It never invents a
 * fact about the place, only labels one that's already known. Best-effort:
 * on any failure the original (low-confidence) guess is left untouched
 * rather than blocking Discover.
 */
export async function classifyLowConfidenceCategories(places: MergedPlace[]): Promise<MergedPlace[]> {
  const toClassify = places
    .map((place, index) => ({ place, index }))
    .filter(({ place }) => place.categoryConfidence === "low");

  if (toClassify.length === 0) return places;

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: AI_MODEL_FAST,
      messages: [
        {
          role: "system",
          content:
            "Classify each real place into exactly one category from the given fixed list of category keys, " +
            "using only its name and address as evidence. Never invent information about the place — just " +
            "pick the single closest-fitting category key for each one, by index.",
        },
        {
          role: "user",
          content: JSON.stringify({
            categories: CATEGORY_KEYS,
            places: toClassify.map(({ place, index }) => ({
              index,
              name: place.name,
              address: place.address,
            })),
          }),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "category_classification",
          strict: true,
          schema: {
            type: "object",
            properties: {
              classifications: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    index: { type: "integer", minimum: 0 },
                    category: { type: "string", enum: CATEGORY_KEYS },
                  },
                  required: ["index", "category"],
                  additionalProperties: false,
                },
              },
            },
            required: ["classifications"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return places;

    const parsed = classificationSchema.parse(JSON.parse(content));
    const categoryByIndex = new Map(parsed.classifications.map((c) => [c.index, c.category]));

    return places.map((place, index) => {
      const classified = categoryByIndex.get(index);
      return classified ? { ...place, category: classified, categoryConfidence: "high" as const } : place;
    });
  } catch {
    return places;
  }
}
