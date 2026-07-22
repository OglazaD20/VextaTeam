import { z } from "zod";

export const askMemorySchema = z.object({
  question: z.string().trim().min(1).max(500),
});
export type AskMemoryInput = z.infer<typeof askMemorySchema>;

export const searchMemorySchema = z.object({
  query: z.string().trim().min(1).max(500),
});
export type SearchMemoryInput = z.infer<typeof searchMemorySchema>;
