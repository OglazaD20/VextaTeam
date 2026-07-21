import { z } from "zod";

import { ACTIVITY_CATEGORIES } from "@/lib/activities/geoapify-client";

const categoryEnum = z.enum(Object.keys(ACTIVITY_CATEGORIES) as [keyof typeof ACTIVITY_CATEGORIES]);

export const addSuggestionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  pitch: z.string().trim().max(280).optional(),
  placeName: z.string().trim().max(140),
  address: z.string().trim().max(280).nullable().optional(),
  estimatedDurationMinutes: z.number().int().positive().max(1440),
  whenIso: z.string().datetime().nullable().optional(),
});
export type AddSuggestionInput = z.infer<typeof addSuggestionSchema>;

export const addEventSchema = z.object({
  name: z.string().trim().min(1).max(160),
  venueName: z.string().trim().max(160),
  address: z.string().trim().max(280).nullable().optional(),
  url: z.string().url(),
  startIso: z.string().datetime(),
  estimatedDurationMinutes: z.number().int().positive().max(1440).default(120),
});
export type AddEventInput = z.infer<typeof addEventSchema>;

export const saveActivitySchema = z.object({
  kind: z.enum(["place", "event"]),
  title: z.string().trim().min(1).max(200),
  subtitle: z.string().trim().min(1).max(200),
  lat: z.number(),
  lng: z.number(),
  startsAt: z.string().datetime().nullable().optional(),
  data: z.record(z.string(), z.unknown()),
});
export type SaveActivityInput = z.infer<typeof saveActivitySchema>;

export const generateSimilarSchema = z.object({
  category: categoryEnum,
  location: z.object({ lat: z.number(), lng: z.number() }),
  maxDistanceKm: z.number().positive().max(50),
  availableMinutes: z.number().int().positive().max(1440),
  budget: z.enum(["free", "low", "medium", "high"]),
  indoorOutdoor: z.enum(["indoor", "outdoor", "any"]),
  social: z.enum(["solo", "group", "any"]),
  referencePlaceName: z.string(),
  referencePitch: z.string(),
});
export type GenerateSimilarInput = z.infer<typeof generateSimilarSchema>;
