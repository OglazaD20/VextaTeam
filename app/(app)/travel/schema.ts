import { z } from "zod";

export const createTripSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    destination: z.string().trim().min(1).max(140),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    budget: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : v),
      z.coerce.number().positive().optional(),
    ),
    currency: z.string().trim().length(3).default("EUR"),
    transportation: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : v),
      z.enum(["flight", "train", "car", "bus", "other"]).optional(),
    ),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });
export type CreateTripInput = z.infer<typeof createTripSchema>;

export const addPackingItemSchema = z.object({
  item: z.string().trim().min(1).max(80),
  category: z.string().trim().min(1).max(30).default("general"),
});
