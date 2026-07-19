import { z } from "zod";

export const scheduleItemTypeEnum = z.enum([
  "meeting",
  "task",
  "deadline",
  "appointment",
  "break",
]);

const emptyToUndefined = (val: unknown) =>
  val === "" || val === null || val === undefined ? undefined : val;

const optionalIsoDatetime = z.preprocess(emptyToUndefined, z.string().datetime().optional());
const optionalDuration = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().positive().max(24 * 60).optional(),
);

export const createScheduleItemSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    type: scheduleItemTypeEnum,
    priority: z.coerce.number().int().min(1).max(5),
    location: z.string().trim().max(200).optional().or(z.literal("")),
    isFixed: z.coerce.boolean().default(false),
    scheduledStart: optionalIsoDatetime,
    scheduledEnd: optionalIsoDatetime,
    estimatedDurationMinutes: optionalDuration,
    dueAt: optionalIsoDatetime,
  })
  .refine(
    (data) =>
      !data.scheduledStart ||
      (!!data.scheduledEnd && new Date(data.scheduledEnd) > new Date(data.scheduledStart)),
    { message: "End time must be after start time", path: ["scheduledEnd"] },
  )
  .refine((data) => data.scheduledStart || data.estimatedDurationMinutes, {
    message: "Give either a start time or an estimated duration for AI to schedule it",
    path: ["estimatedDurationMinutes"],
  });

export type CreateScheduleItemInput = z.infer<typeof createScheduleItemSchema>;
