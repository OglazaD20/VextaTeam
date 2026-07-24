import { z } from "zod";

import { ACTION_TYPES, AUTOMATION_EVENTS, CONDITION_TYPES } from "@/lib/automations/types";

const conditionSchema = z.object({
  type: z.enum(CONDITION_TYPES as [string, ...string[]]),
  value: z.union([
    z.string().max(80),
    z.number(),
    z.array(z.number()).max(2),
    z.object({ category: z.string().max(60), pct: z.number().min(0).max(1000) }),
  ]),
});

const actionSchema = z.object({
  type: z.enum(ACTION_TYPES as [string, ...string[]]),
  title: z.string().max(120).optional(),
  body: z.string().max(300).optional(),
  note: z.string().max(500).optional(),
  category: z.string().max(60).optional(),
  shiftMinutes: z.number().int().min(-1440).max(1440).optional(),
  inMinutes: z.number().int().min(0).max(10_080).optional(),
  estimatedDurationMinutes: z.number().int().min(5).max(600).optional(),
  xp: z.number().int().min(1).max(1000).optional(),
});

const triggerSchema = z.union([
  z.object({
    type: z.literal("schedule"),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM"),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  }),
  z.object({
    type: z.literal("event"),
    event: z.enum(AUTOMATION_EVENTS as [string, ...string[]]),
  }),
]);

export const upsertAutomationSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(80),
  description: z.string().max(300).nullable().optional(),
  enabled: z.boolean().default(true),
  trigger: triggerSchema,
  conditionGroups: z.array(z.array(conditionSchema)).max(10),
  actions: z.array(actionSchema).min(1).max(10),
});

export type UpsertAutomationInput = z.infer<typeof upsertAutomationSchema>;
