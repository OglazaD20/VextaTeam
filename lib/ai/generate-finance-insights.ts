import { z } from "zod";

import { AI_MODEL_FAST, getOpenAIClient } from "./client";

const insightsSchema = z.object({
  headline: z.string().max(120),
  insights: z
    .array(z.object({ title: z.string().max(80), detail: z.string().max(200) }))
    .max(6),
});

export type FinanceInsightsResult = z.infer<typeof insightsSchema>;

export interface FinanceInsightSignals {
  currency: string;
  cashFlow: { income: number; expenses: number; net: number };
  spendingByCategoryThisMonth: Record<string, number>;
  spendingByCategoryLastMonth: Record<string, number>;
  budgetUsage: { category: string; limit: number; spent: number; pctUsed: number; isOverBudget: boolean }[];
  projectedMonthEndSpend: number;
  monthlySubscriptionCost: number;
  overdueSubscriptions: { name: string; amount: number; daysOverdue: number }[];
  netWorth: number;
}

/**
 * Same principle as the AI Coach: phrases insights strictly from precomputed
 * numbers (lib/finance/calculations.ts) — never invents a percentage,
 * amount, or "you spent X% more" claim not present in the input.
 */
export async function generateFinanceInsights(
  signals: FinanceInsightSignals,
): Promise<FinanceInsightsResult> {
  const openai = getOpenAIClient();

  const response = await openai.chat.completions.create({
    model: AI_MODEL_FAST,
    messages: [
      {
        role: "system",
        content: [
          "You are a direct, practical personal finance assistant. You are given precomputed",
          "statistics only — never invent an amount, percentage, or comparison not present in the",
          "input. Skip any signal that's null/empty rather than guessing. Write insights in second",
          "person, concrete and specific, in the style of: \"You spent 21% more on food than last",
          "month.\" \"You could save €85 this month if you stayed under your entertainment budget.\"",
          "\"You forgot about a recurring subscription — Name hasn't billed in 45 days.\" Write 2-5",
          "insights (fewer if there isn't much signal) and one short headline summarizing the overall",
          "financial picture for this month. Always include the currency code given.",
        ].join(" "),
      },
      { role: "user", content: JSON.stringify(signals) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "finance_insights",
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
                },
                required: ["title", "detail"],
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
    throw new Error("The finance assistant returned an empty response");
  }

  return insightsSchema.parse(JSON.parse(content));
}
