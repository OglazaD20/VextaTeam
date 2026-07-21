import { z } from "zod";

const optionalNumber = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.number().optional(),
);

const optionalText = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.string().trim().max(280).optional(),
);

const optionalTime = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.string().regex(/^\d{2}:\d{2}$/).optional(),
);

export const logHealthMetricsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  sleepHours: optionalNumber,
  sleepQuality: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().min(1).max(5).optional(),
  ),
  bedtime: optionalTime,
  wakeTime: optionalTime,
  steps: optionalNumber,
  caloriesBurned: optionalNumber,
  restingHeartRate: optionalNumber,
  avgHeartRate: optionalNumber,
  activeMinutes: optionalNumber,
  exerciseType: optionalText,
  exerciseMinutes: optionalNumber,
  distanceKm: optionalNumber,
  notes: optionalText,
});
export type LogHealthMetricsInput = z.infer<typeof logHealthMetricsSchema>;
