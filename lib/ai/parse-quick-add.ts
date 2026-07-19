import { z } from "zod";

import { AI_MODEL_FAST, getOpenAIClient } from "./client";

const parsedItemSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(["meeting", "task", "deadline", "appointment", "break"]),
  estimatedDurationMinutes: z.number().int().min(5).max(480).nullable(),
  dueAt: z.string().nullable(),
  priority: z.number().int().min(1).max(5),
});

export type ParsedQuickAddItem = z.infer<typeof parsedItemSchema>;

export async function parseQuickAddText(
  text: string,
  referenceIso: string,
  timeZone: string,
): Promise<ParsedQuickAddItem> {
  const openai = getOpenAIClient();

  const response = await openai.chat.completions.create({
    model: AI_MODEL_FAST,
    messages: [
      {
        role: "system",
        content: [
          "Parse one quick-add entry for a daily planner into structured fields.",
          `The current moment is ${referenceIso} in timezone ${timeZone}. Resolve relative dates ("tomorrow", "friday", "in 2 hours") against that and return dueAt as an ISO 8601 datetime with timezone offset, or null if no date/deadline is implied.`,
          "If a duration isn't stated or clearly implied (e.g. \"~2h\", \"30 min\"), return null for estimatedDurationMinutes rather than guessing.",
          "Default priority to 3 unless urgency language implies otherwise (1 = most urgent, 5 = someday).",
          "Treat text describing content someone else scheduled with you as a meeting; a hard external deadline as deadline; a personal to-do as task; a location-based booking as appointment.",
        ].join(" "),
      },
      { role: "user", content: text },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "quick_add_item",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            type: {
              type: "string",
              enum: ["meeting", "task", "deadline", "appointment", "break"],
            },
            estimatedDurationMinutes: { type: ["integer", "null"] },
            dueAt: { type: ["string", "null"] },
            priority: { type: "integer", minimum: 1, maximum: 5 },
          },
          required: ["title", "type", "estimatedDurationMinutes", "dueAt", "priority"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("The AI parser returned an empty response");
  }

  return parsedItemSchema.parse(JSON.parse(content));
}
