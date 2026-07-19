import { z } from "zod";

export const startFocusSessionSchema = z.object({
  plannedDurationMinutes: z.coerce.number().int().positive().max(8 * 60),
});

export const endFocusSessionSchema = z.object({
  actualDurationMinutes: z.coerce.number().int().min(0).max(8 * 60),
  pomodoroCycles: z.coerce.number().int().min(0).max(50),
  interrupted: z.coerce.boolean(),
  moodAfter: z.coerce.number().int().min(1).max(5).optional(),
  energyAfter: z.coerce.number().int().min(1).max(5).optional(),
});
