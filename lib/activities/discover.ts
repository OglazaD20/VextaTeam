import { z } from "zod";

import { AI_MODEL_FAST, getOpenAIClient } from "@/lib/ai/client";
import { estimateTravelMinutes, haversineDistanceKm, type LatLng } from "./distance";
import {
  inferActivityCategory,
  searchNearbyPlaces,
  type ActivityCategory,
  type PlaceCandidate,
} from "./geoapify-client";
import { getCurrentWeather, type WeatherSnapshot } from "./weather-client";

export interface DiscoverFilters {
  categories: ActivityCategory[];
  location: LatLng;
  maxDistanceKm: number;
  availableMinutes: number;
  budget: "free" | "low" | "medium" | "high";
  indoorOutdoor: "indoor" | "outdoor" | "any";
  social: "solo" | "group" | "any";
  /** Place names to leave out of the results — used by "generate similar" to avoid re-suggesting the reference place. */
  excludePlaceNames?: string[];
  /** When set, biases the AI toward picks with a similar vibe to this place instead of maximizing variety. */
  similarTo?: { placeName: string; pitch: string };
}

export interface ActivitySuggestion {
  title: string;
  pitch: string;
  placeName: string;
  address: string | null;
  location: LatLng;
  distanceKm: number;
  travelMinutes: number;
  travelMode: "walk" | "drive";
  estimatedDurationMinutes: number;
  costTier: "free" | "low" | "medium" | "high";
  indoorOutdoor: "indoor" | "outdoor";
  weather: WeatherSnapshot;
  category: ActivityCategory;
  openingHours: string | null;
  website: string | null;
}

const suggestionsSchema = z.object({
  suggestions: z.array(
    z.object({
      candidateIndex: z.number().int().min(0),
      title: z.string().max(80),
      pitch: z.string().max(180),
      estimatedDurationMinutes: z.number().int().min(10).max(480),
      costTier: z.enum(["free", "low", "medium", "high"]),
      indoorOutdoor: z.enum(["indoor", "outdoor"]),
    }),
  ),
});

function rankedCandidates(
  candidates: PlaceCandidate[],
  location: LatLng,
  maxDistanceKm: number,
  excludePlaceNames: string[],
) {
  const excluded = new Set(excludePlaceNames.map((n) => n.toLowerCase()));
  return candidates
    .filter((place) => !excluded.has(place.name.toLowerCase()))
    .map((place) => ({ place, distanceKm: haversineDistanceKm(location, place.location) }))
    .filter((c) => c.distanceKm <= maxDistanceKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 40);
}

export async function discoverActivities(filters: DiscoverFilters): Promise<ActivitySuggestion[]> {
  const [places, weather] = await Promise.all([
    searchNearbyPlaces(filters.categories, filters.location, filters.maxDistanceKm),
    getCurrentWeather(filters.location),
  ]);

  const ranked = rankedCandidates(
    places,
    filters.location,
    filters.maxDistanceKm,
    filters.excludePlaceNames ?? [],
  );
  if (ranked.length === 0) {
    return [];
  }

  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: AI_MODEL_FAST,
    messages: [
      {
        role: "system",
        content:
          "You suggest specific, appealing activities for a daily planner app, using only the real " +
          "place candidates provided — never invent a place, address, or distance. Pick as many good " +
          "candidates as reasonably fit the user's filters and current weather — aim for 12 to 20 when " +
          "there are enough good options, don't pad the list with weak or redundant picks just to hit " +
          "that range (avoid outdoor picks in rain, prefer them in good weather). Write a short, vivid " +
          "one-sentence pitch per suggestion, in the " +
          "style of \"Go for a sunset walk in Łazienki Park.\" Reference each pick by its candidateIndex " +
          "in the provided list." +
          (filters.similarTo
            ? ` The user specifically liked "${filters.similarTo.placeName}" (${filters.similarTo.pitch}) — favor candidates with a similar vibe over maximizing variety.`
            : ""),
      },
      {
        role: "user",
        content: JSON.stringify({
          candidates: ranked.map((c, index) => ({
            index,
            name: c.place.name,
            category: c.place.category,
            distanceKm: c.distanceKm,
          })),
          weather,
          filters: {
            availableMinutes: filters.availableMinutes,
            budget: filters.budget,
            indoorOutdoor: filters.indoorOutdoor,
            social: filters.social,
          },
        }),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "activity_suggestions",
        strict: true,
        schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  candidateIndex: { type: "integer", minimum: 0 },
                  title: { type: "string" },
                  pitch: { type: "string" },
                  estimatedDurationMinutes: { type: "integer", minimum: 10, maximum: 480 },
                  costTier: { type: "string", enum: ["free", "low", "medium", "high"] },
                  indoorOutdoor: { type: "string", enum: ["indoor", "outdoor"] },
                },
                required: [
                  "candidateIndex",
                  "title",
                  "pitch",
                  "estimatedDurationMinutes",
                  "costTier",
                  "indoorOutdoor",
                ],
                additionalProperties: false,
              },
            },
          },
          required: ["suggestions"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("The AI activity suggester returned an empty response");
  }

  const parsed = suggestionsSchema.parse(JSON.parse(content));

  return parsed.suggestions
    .filter((s) => s.candidateIndex >= 0 && s.candidateIndex < ranked.length)
    .map((s) => {
      const candidate = ranked[s.candidateIndex];
      const travelMode = candidate.distanceKm <= 1.5 ? "walk" : "drive";
      return {
        title: s.title,
        pitch: s.pitch,
        placeName: candidate.place.name,
        address: candidate.place.address,
        location: candidate.place.location,
        distanceKm: candidate.distanceKm,
        travelMinutes: estimateTravelMinutes(candidate.distanceKm, travelMode),
        travelMode,
        estimatedDurationMinutes: s.estimatedDurationMinutes,
        costTier: s.costTier,
        indoorOutdoor: s.indoorOutdoor,
        weather,
        category: inferActivityCategory(candidate.place.category, filters.categories),
        openingHours: candidate.place.openingHours,
        website: candidate.place.website,
      };
    });
}
