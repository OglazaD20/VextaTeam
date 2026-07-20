import { z } from "zod";

export const scheduleItemTypeEnum = z.enum([
  "meeting",
  "task",
  "deadline",
  "appointment",
  "break",
  "activity",
]);

const emptyToUndefined = (val: unknown) =>
  val === "" || val === null || val === undefined ? undefined : val;

const optionalIsoDatetime = z.preprocess(emptyToUndefined, z.string().datetime().optional());
const optionalDuration = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().positive().max(24 * 60).optional(),
);
const optionalText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

export const recurrenceRuleSchema = z.object({
  freq: z.enum(["daily", "weekly", "monthly"]),
  interval: z.coerce.number().int().min(1).max(30),
  byWeekday: z.array(z.number().int().min(0).max(6)).optional(),
  until: z.string().datetime().nullable().optional(),
  count: z.coerce.number().int().positive().nullable().optional(),
});

const optionalRecurrenceRule = z.preprocess((val) => {
  if (val === "" || val === null || val === undefined) return undefined;
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return undefined;
    }
  }
  return val;
}, recurrenceRuleSchema.optional());

const baseTaskFields = {
  title: z.string().trim().min(1, "Title is required").max(200),
  type: scheduleItemTypeEnum,
  priority: z.coerce.number().int().min(1).max(5),
  location: optionalText(200),
  category: optionalText(60),
  notes: optionalText(5000),
  isFixed: z.coerce.boolean().default(false),
  scheduledStart: optionalIsoDatetime,
  scheduledEnd: optionalIsoDatetime,
  estimatedDurationMinutes: optionalDuration,
  dueAt: optionalIsoDatetime,
  recurrenceRule: optionalRecurrenceRule,
};

export const createScheduleItemSchema = z
  .object(baseTaskFields)
  .refine(
    (data) =>
      !data.scheduledStart ||
      (!!data.scheduledEnd && new Date(data.scheduledEnd) > new Date(data.scheduledStart)),
    { message: "End time must be after start time", path: ["scheduledEnd"] },
  )
  .refine((data) => data.scheduledStart || data.estimatedDurationMinutes, {
    message: "Give either a start time or an estimated duration for AI to schedule it",
    path: ["estimatedDurationMinutes"],
  })
  .refine((data) => !data.recurrenceRule || !!data.scheduledStart, {
    message: "Recurring tasks need a start time",
    path: ["recurrenceRule"],
  });

export type CreateScheduleItemInput = z.infer<typeof createScheduleItemSchema>;

export const updateScheduleItemSchema = z
  .object(baseTaskFields)
  .partial()
  .extend({ title: baseTaskFields.title });

export type UpdateScheduleItemInput = z.infer<typeof updateScheduleItemSchema>;
