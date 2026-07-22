import { z } from "zod";

import { AI_MODEL_FAST, getOpenAIClient } from "./client";

const breakdownSchema = z.object({
  milestones: z.array(z.string().min(1).max(120)).min(3).max(8),
  firstTasks: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        estimatedDurationMinutes: z.number().int().min(5).max(240),
      }),
    )
    .min(2)
    .max(5),
});

export type GoalBreakdown = z.infer<typeof breakdownSchema>;

export interface GoalBreakdownInput {
  title: string;
  description: string | null;
  category: string;
  deadline: string | null;
}

/**
 * Splits a goal into concrete milestones plus a handful of immediately
 * actionable first tasks. Purely generative (unlike the fact-phrasing AI
 * calls elsewhere) — there's no user data to stay faithful to here, just a
 * title/description to turn into a realistic plan.
 */
export async function generateGoalBreakdown(input: GoalBreakdownInput): Promise<GoalBreakdown> {
  const openai = getOpenAIClient();

  const response = await openai.chat.completions.create({
    model: AI_MODEL_FAST,
    messages: [
      {
        role: "system",
        content:
          "Break a personal goal into a realistic plan. Produce 3-8 concrete, ordered milestones " +
          "(meaningful checkpoints, not tiny steps — e.g. for \"run a marathon\": \"Run a 5K without " +
          "stopping\", \"Complete a half marathon\", \"Run 30km in training\"). Then produce 2-5 " +
          "specific first tasks the person could start on today or this week to get moving right " +
          "away, each with a realistic duration estimate in minutes. Never be vague (\"work on goal\") " +
          "— always name a specific, doable action.",
      },
      {
        role: "user",
        content: JSON.stringify({
          title: input.title,
          description: input.description,
          category: input.category,
          deadline: input.deadline,
        }),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "goal_breakdown",
        strict: true,
        schema: {
          type: "object",
          properties: {
            milestones: { type: "array", items: { type: "string" } },
            firstTasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  estimatedDurationMinutes: { type: "integer", minimum: 5, maximum: 240 },
                },
                required: ["title", "estimatedDurationMinutes"],
                additionalProperties: false,
              },
            },
          },
          required: ["milestones", "firstTasks"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("The AI goal planner returned an empty response");
  }

  return breakdownSchema.parse(JSON.parse(content));
}
