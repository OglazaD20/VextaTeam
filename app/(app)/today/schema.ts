import { z } from "zod";

export const scheduleItemTypeEnum = z.enum([
  "meeting",
  "task",
  "deadline",
  "appointment",
  "break",
]);

export const createScheduleItemSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    type: scheduleItemTypeEnum,
    priority: z.coerce.number().int().min(1).max(5),
    location: z.string().trim().max(200).optional().or(z.literal("")),
    isFixed: z.coerce.boolean().default(false),
    scheduledStart: z.string().datetime(),
    scheduledEnd: z.string().datetime(),
    estimatedDurationMinutes: z.coerce.number().int().positive().max(24 * 60),
  })
  .refine((data) => new Date(data.scheduledEnd) > new Date(data.scheduledStart), {
    message: "End time must be after start time",
    path: ["scheduledEnd"],
  });

export type CreateScheduleItemInput = z.infer<typeof createScheduleItemSchema>;
