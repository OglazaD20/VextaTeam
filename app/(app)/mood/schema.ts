import { z } from "zod";

const optionalScale = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.number().int().min(1).max(5).optional(),
);

export const logMoodSchema = z.object({
  mood: z.coerce.number().int().min(1).max(5),
  stress: optionalScale,
  energy: optionalScale,
  motivation: optionalScale,
  productivity: optionalScale,
  happiness: optionalScale,
  sleepQuality: optionalScale,
  anxiety: optionalScale,
  confidence: optionalScale,
  focus: optionalScale,
  note: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().trim().max(500).optional(),
  ),
});
export type LogMoodInput = z.infer<typeof logMoodSchema>;
