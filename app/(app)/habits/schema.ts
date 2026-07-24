import { z } from "zod";

export const habitCategoryEnum = z.enum([
  "sleep",
  "fitness",
  "hydration",
  "reading",
  "mindfulness",
  "movement",
  "custom",
]);

export const habitCadenceEnum = z.enum(["daily", "weekly"]);

const optionalTrimmed = (max: number) =>
  z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string().trim().max(max).optional(),
  );

const optionalPositiveNumber = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.coerce.number().positive().optional(),
);

export const createHabitSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  category: habitCategoryEnum,
  cadence: habitCadenceEnum,
  targetValue: optionalPositiveNumber,
  targetUnit: optionalTrimmed(40),
  preferredTime: optionalTrimmed(8),
  reminderEnabled: z.coerce.boolean().default(false),
});

export type CreateHabitInput = z.infer<typeof createHabitSchema>;

export const updateHabitSchema = createHabitSchema.partial().extend({
  name: createHabitSchema.shape.name,
});
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;
