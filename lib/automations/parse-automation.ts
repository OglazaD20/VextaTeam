import { z } from "zod";

import { AI_MODEL_FAST, getOpenAIClient } from "@/lib/ai/client";
import { ACTION_TYPES, AUTOMATION_EVENTS, CONDITION_TYPES } from "./types";

const conditionSchema = z.object({
  type: z.enum(CONDITION_TYPES as [string, ...string[]]),
  value: z.union([z.string(), z.number(), z.array(z.number()), z.object({ category: z.string(), pct: z.number() })]),
});

const actionSchema = z.object({
  type: z.enum(ACTION_TYPES as [string, ...string[]]),
  title: z.string().optional(),
  body: z.string().optional(),
  note: z.string().optional(),
  category: z.string().optional(),
  shiftMinutes: z.number().optional(),
  inMinutes: z.number().optional(),
  estimatedDurationMinutes: z.number().optional(),
  xp: z.number().optional(),
});

const parsedAutomationSchema = z.object({
  understood: z.boolean(),
  name: z.string().max(80),
  description: z.string().max(200),
  trigger: z.union([
    z.object({ type: z.literal("schedule"), time: z.string(), daysOfWeek: z.array(z.number().min(0).max(6)) }),
    z.object({ type: z.literal("event"), event: z.enum(AUTOMATION_EVENTS as [string, ...string[]]) }),
  ]),
  conditionGroups: z.array(z.array(conditionSchema)),
  actions: z.array(actionSchema),
});

export type ParsedAutomation = z.infer<typeof parsedAutomationSchema>;

/**
 * Turns a plain-language automation request ("Every weekday at 8am remind
 * me to check my calendar") into the fixed trigger/condition/action
 * vocabulary the engine can actually execute. The AI is constrained by the
 * response schema to that same fixed vocabulary — it can only combine real
 * capabilities, never invent a new trigger/condition/action kind. If the
 * request doesn't map to anything the engine supports, `understood` comes
 * back false rather than a guessed automation.
 */
export async function parseAutomationRequest(request: string): Promise<ParsedAutomation | null> {
  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: AI_MODEL_FAST,
      messages: [
        {
          role: "system",
          content:
            "Turn a plain-language automation request into an IF/THEN automation using ONLY these building " +
            `blocks. Trigger: either {type:"schedule", time:"HH:MM", daysOfWeek:[0-6]} (0=Sunday; empty array ` +
            `= every day) or {type:"event", event: one of ${AUTOMATION_EVENTS.join(", ")}}. Conditions (optional, ` +
            `grouped as OR-of-ANDs — conditionGroups is an array of arrays; empty means "always run"): each ` +
            `condition is {type, value} where type is one of ${CONDITION_TYPES.join(", ")} — value is a number ` +
            `for *_at_least, a string for *_is, an [startMinutes,endMinutes] pair for time_of_day_between, or ` +
            `{category, pct} for budget_category_over_pct. Actions (at least one): each is {type, ...fields} ` +
            `where type is one of ${ACTION_TYPES.join(", ")} — create_task needs title (+ optional inMinutes, ` +
            "estimatedDurationMinutes), send_notification needs title+body, reschedule_matching_items needs " +
            "shiftMinutes (+ optional category), award_bonus_xp needs xp, log_note needs note. If the request " +
            "doesn't genuinely map to a real, supported trigger/condition/action combination, set understood " +
            "to false and leave the rest as reasonable placeholders — never invent a capability outside this " +
            "list to force a match.",
        },
        { role: "user", content: request },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "parsed_automation",
          strict: false,
          schema: {
            type: "object",
            properties: {
              understood: { type: "boolean" },
              name: { type: "string" },
              description: { type: "string" },
              trigger: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["schedule", "event"] },
                  time: { type: "string" },
                  daysOfWeek: { type: "array", items: { type: "integer" } },
                  event: { type: "string", enum: AUTOMATION_EVENTS },
                },
                required: ["type"],
              },
              conditionGroups: {
                type: "array",
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: CONDITION_TYPES },
                      value: {},
                    },
                    required: ["type", "value"],
                  },
                },
              },
              actions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ACTION_TYPES },
                    title: { type: "string" },
                    body: { type: "string" },
                    note: { type: "string" },
                    category: { type: "string" },
                    shiftMinutes: { type: "number" },
                    inMinutes: { type: "number" },
                    estimatedDurationMinutes: { type: "number" },
                    xp: { type: "number" },
                  },
                  required: ["type"],
                },
              },
            },
            required: ["understood", "name", "description", "trigger", "conditionGroups", "actions"],
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = parsedAutomationSchema.parse(JSON.parse(content));
    if (!parsed.understood || parsed.actions.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}
