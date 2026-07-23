import { z } from "zod";

import { AI_MODEL_FAST, getOpenAIClient } from "@/lib/ai/client";
import { languageInstruction } from "@/lib/ai/language";
import { shouldMoveOutdoorActivityIndoors } from "@/lib/weather/planner";
import type { Locale } from "@/lib/i18n/locales";
import { estimateTravelMinutes, haversineDistanceKm, type LatLng } from "./distance";
import {
  inferActivityCategory,
  searchNearbyPlaces,
  type ActivityCategory,
  type PlaceCandidate,
} from "./geoapify-client";
import { getOpeningStatus } from "./opening-hours";
import { isWeatherUnfavorableFor } from "./rank";
import { getCurrentWeather, getHourlyForecast, type ForecastPoint, type WeatherSnapshot } from "./weather-client";

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
  /** A short, factual explanation of why this was picked (distance, hours, weather fit, budget fit) — never a fabricated rating or popularity claim. */
  whyRecommended: string;
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
  isOpenNow: boolean | null;
  closesAt: string | null;
}

const suggestionsSchema = z.object({
  suggestions: z.array(
    z.object({
      candidateIndex: z.number().int().min(0),
      title: z.string().max(80),
      pitch: z.string().max(180),
      whyRecommended: z.string().max(200),
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
  requestedCategories: ActivityCategory[],
  badOutdoorWeather: boolean,
) {
  const excluded = new Set(excludePlaceNames.map((n) => n.toLowerCase()));
  return candidates
    .filter((place) => !excluded.has(place.name.toLowerCase()))
    .map((place) => {
      const category = inferActivityCategory(place.category, requestedCategories);
      return {
        place,
        category,
        distanceKm: haversineDistanceKm(location, place.location),
        opening: getOpeningStatus(place.openingHours),
        weatherUnfavorable: isWeatherUnfavorableFor(category, badOutdoorWeather),
      };
    })
    .filter((c) => c.distanceKm <= maxDistanceKm)
    .sort((a, b) => {
      // Open (or unknown-hours) places rank ahead of confirmed-closed ones,
      // then weather-unfavorable outdoor picks rank behind weather-fine ones
      // — the AI still makes the final call, but this keeps weak candidates
      // out of the top of the list it sees first.
      const aClosed = a.opening.isOpenNow === false ? 1 : 0;
      const bClosed = b.opening.isOpenNow === false ? 1 : 0;
      if (aClosed !== bClosed) return aClosed - bClosed;
      const aWeather = a.weatherUnfavorable ? 1 : 0;
      const bWeather = b.weatherUnfavorable ? 1 : 0;
      if (aWeather !== bWeather) return aWeather - bWeather;
      return a.distanceKm - b.distanceKm;
    })
    .slice(0, 40);
}

export async function discoverActivities(
  filters: DiscoverFilters,
  locale: Locale,
): Promise<ActivitySuggestion[]> {
  const [places, weather, forecast] = await Promise.all([
    searchNearbyPlaces(filters.categories, filters.location, filters.maxDistanceKm),
    getCurrentWeather(filters.location),
    getHourlyForecast(filters.location).catch((): ForecastPoint[] => []),
  ]);

  const badOutdoorWeather = shouldMoveOutdoorActivityIndoors(weather, forecast);

  const ranked = rankedCandidates(
    places,
    filters.location,
    filters.maxDistanceKm,
    filters.excludePlaceNames ?? [],
    filters.categories,
    badOutdoorWeather,
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
          "place candidates provided — never invent a place, address, or distance, and never invent a " +
          "rating, review count, or popularity claim since none is given to you. Pick as many good " +
          "candidates as reasonably fit the user's filters and current weather — aim for 12 to 20 when " +
          "there are enough good options, don't pad the list with weak or redundant picks just to hit " +
          "that range (avoid outdoor picks in rain, prefer them in good weather). Each candidate has " +
          "isOpenNow (true/false/null if hours are unknown), closesAt (today's closing time, when " +
          "open), and weatherUnfavorable (true if it's a mostly-outdoor place and current weather is " +
          "bad for outdoor activities). Strongly prefer candidates that are open now and not " +
          "weatherUnfavorable — only include one that's closed or weather-unfavorable if there's no good " +
          "alternative among the candidates that fits the filters, and if you do, say so plainly in the " +
          "pitch (e.g. \"closed now, reopens tomorrow\") — never imply a closed place is open. Write a " +
          "short, vivid one-sentence pitch per suggestion, in the style of \"Go for a sunset walk in " +
          "Łazienki Park.\" Also write a separate whyRecommended: one short factual sentence citing only " +
          "the real facts you were given for that candidate — distance/travel time, open-now/closing " +
          "time, weather fit, or how well it matches the requested budget/duration/indoor-outdoor filters " +
          "(e.g. \"5 min away, open until 11pm, and indoors while it's raining\") — never mention ratings, " +
          "reviews, or popularity. Reference each pick by its candidateIndex in the provided list." +
          (filters.similarTo
            ? ` The user specifically liked "${filters.similarTo.placeName}" (${filters.similarTo.pitch}) — favor candidates with a similar vibe over maximizing variety.`
            : "") +
          " " +
          languageInstruction(locale),
      },
      {
        role: "user",
        content: JSON.stringify({
          candidates: ranked.map((c, index) => ({
            index,
            name: c.place.name,
            category: c.place.category,
            distanceKm: c.distanceKm,
            isOpenNow: c.opening.isOpenNow,
            closesAt: c.opening.closesAt,
            weatherUnfavorable: c.weatherUnfavorable,
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
                  whyRecommended: { type: "string" },
                  estimatedDurationMinutes: { type: "integer", minimum: 10, maximum: 480 },
                  costTier: { type: "string", enum: ["free", "low", "medium", "high"] },
                  indoorOutdoor: { type: "string", enum: ["indoor", "outdoor"] },
                },
                required: [
                  "candidateIndex",
                  "title",
                  "pitch",
                  "whyRecommended",
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
        whyRecommended: s.whyRecommended,
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
        category: candidate.category,
        openingHours: candidate.place.openingHours,
        website: candidate.place.website,
        isOpenNow: candidate.opening.isOpenNow,
        closesAt: candidate.opening.closesAt,
      };
    });
}
