import { z } from "zod";

export const goalCategoryEnum = z.enum([
  "fitness",
  "business",
  "learning",
  "finance",
  "reading",
  "career",
  "travel",
  "personal",
  "health",
  "custom",
]);

const optionalNumber = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.number().optional(),
);

const optionalString = (max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().trim().max(max).optional(),
  );

export const createGoalSchema = z.object({
  title: z.string().trim().min(1).max(140),
  description: optionalString(2000),
  category: goalCategoryEnum,
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  color: optionalString(20),
  icon: optionalString(10),
  deadline: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ),
  targetValue: optionalNumber,
  unit: optionalString(30),
  aiBreakdown: z.preprocess((v) => v === "true" || v === true, z.boolean()).default(false),
});
export type CreateGoalInput = z.infer<typeof createGoalSchema>;

export const updateGoalSchema = z.object({
  title: z.string().trim().min(1).max(140),
  description: optionalString(2000),
  category: goalCategoryEnum,
  priority: z.enum(["low", "medium", "high"]),
  color: optionalString(20),
  icon: optionalString(10),
  deadline: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ),
  targetValue: optionalNumber,
  currentValue: optionalNumber,
  unit: optionalString(30),
  manualProgressPct: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().min(0).max(100).optional(),
  ),
});
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

export const addMilestoneSchema = z.object({
  goalId: z.string().uuid(),
  title: z.string().trim().min(1).max(140),
});
export type AddMilestoneInput = z.infer<typeof addMilestoneSchema>;
