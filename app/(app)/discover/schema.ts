import { z } from "zod";

export const addSuggestionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  pitch: z.string().trim().max(280).optional(),
  placeName: z.string().trim().max(140),
  address: z.string().trim().max(280).nullable().optional(),
  estimatedDurationMinutes: z.number().int().positive().max(1440),
  whenIso: z.string().datetime().nullable().optional(),
});
export type AddSuggestionInput = z.infer<typeof addSuggestionSchema>;
