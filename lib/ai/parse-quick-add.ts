import { z } from "zod";

import { AI_MODEL_FAST, getOpenAIClient } from "./client";

const parsedItemSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(["meeting", "task", "deadline", "appointment", "break"]),
  estimatedDurationMinutes: z.number().int().min(5).max(480).nullable(),
  scheduledStart: z.string().nullable(),
  dueAt: z.string().nullable(),
  priority: z.number().int().min(1).max(5),
  category: z.string().max(40).nullable(),
  tags: z.array(z.string().max(30)).max(5),
  location: z.string().max(140).nullable(),
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
          `The current moment is ${referenceIso} in timezone ${timeZone}. Resolve relative dates ("tomorrow", "friday", "in 2 hours") against that.`,
          "Distinguish a concrete time to DO the thing (scheduledStart, e.g. \"gym tomorrow 18:00\" or \"dinner friday 20:00\") from a deadline it must be done BY (dueAt, e.g. \"before friday\", \"due next week\"). Only one of them is usually set — most inputs give you a start time OR a deadline, rarely both. Return null for whichever isn't implied.",
          "If a duration isn't stated or clearly implied (e.g. \"~2h\", \"30 min\", \"for 2 hours\"), return null for estimatedDurationMinutes rather than guessing.",
          "Default priority to 3 unless urgency language implies otherwise (1 = most urgent, 5 = someday).",
          "Treat text describing content someone else scheduled with you as a meeting; a hard external deadline as deadline; a personal to-do as task; a location-based booking as appointment.",
          "Extract a short free-text category if one is obviously implied (e.g. \"Work\", \"Health\", \"Personal\"), else null. Extract up to 5 short single-word-ish tags if implied by context, else an empty array. Extract a location/place name if one is stated (e.g. \"at the gym\", \"in Łazienki Park\", \"Zoom\"), else null — never invent one.",
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
            scheduledStart: { type: ["string", "null"] },
            dueAt: { type: ["string", "null"] },
            priority: { type: "integer", minimum: 1, maximum: 5 },
            category: { type: ["string", "null"] },
            tags: { type: "array", items: { type: "string" } },
            location: { type: ["string", "null"] },
          },
          required: [
            "title",
            "type",
            "estimatedDurationMinutes",
            "scheduledStart",
            "dueAt",
            "priority",
            "category",
            "tags",
            "location",
          ],
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
