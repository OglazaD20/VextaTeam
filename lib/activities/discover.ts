import { z } from "zod";

import { AI_MODEL_FAST, getOpenAIClient } from "@/lib/ai/client";
import { languageInstruction } from "@/lib/ai/language";
import { shouldMoveOutdoorActivityIndoors } from "@/lib/weather/planner";
import type { Locale } from "@/lib/i18n/locales";
import { estimateTravelMinutes, haversineDistanceKm, type LatLng } from "./distance";
import type { ActivityCategory } from "./category-taxonomy";
import { classifyLowConfidenceCategories } from "./classify-category";
import { mergePlaceResults, type MergedPlace } from "./providers/merge-places";
import { searchAllProviders } from "./providers/search-all";
import type { PlaceSource } from "./providers/types";
import { computeCandidateScore, isWeatherUnfavorableFor, passesPostAIFilters, passesPreAIFilters, type DiscoverSmartFilters } from "./rank";
import { getCurrentWeather, getHourlyForecast, type ForecastPoint, type WeatherSnapshot } from "./weather-client";

export type { DiscoverSmartFilters } from "./rank";

const MIN_RESULT_COUNT = 3;
const MAX_RESULT_COUNT = 50;
const CANDIDATE_POOL_CAP = 90;

export interface DiscoverFilters {
  categories: ActivityCategory[];
  location: LatLng;
  maxDistanceKm: number;
  availableMinutes: number;
  budget: "free" | "low" | "medium" | "high";
  indoorOutdoor: "indoor" | "outdoor" | "any";
  social: "solo" | "group" | "any";
  /** How many suggestions the user wants back — the AI aims for this many good ones, never padded with weak picks. */
  resultCount?: number;
  smartFilters?: DiscoverSmartFilters;
  /** Subjective preferences with no real data source (family friendly, pet friendly, romantic) — applied as AI judgment from real category/description context, never a hard filter. */
  preferenceHints?: ("familyFriendly" | "petFriendly" | "romantic")[];
  /** Place names to leave out of the results — used by "generate similar" to avoid re-suggesting the reference place. */
  excludePlaceNames?: string[];
  /** When set, biases the AI toward picks with a similar vibe to this place instead of maximizing variety. */
  similarTo?: { placeName: string; pitch: string };
}

export interface ActivitySuggestion {
  title: string;
  pitch: string;
  /** A short, factual explanation of why this was picked (distance, hours, weather fit, budget fit, rating) — never a fabricated rating or popularity claim. */
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
  /** Real ratings/review data merged across configured providers (Geoapify alone never has these — null until Google/TripAdvisor keys are set). */
  rating: number | null;
  reviewCount: number | null;
  priceLevel: number | null;
  description: string | null;
  imageUrl: string | null;
  wheelchairAccessible: boolean | null;
  sources: PlaceSource[];
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
  candidates: MergedPlace[],
  location: LatLng,
  maxDistanceKm: number,
  excludePlaceNames: string[],
  badOutdoorWeather: boolean,
  smartFilters: DiscoverSmartFilters,
  poolSize: number,
) {
  const excluded = new Set(excludePlaceNames.map((n) => n.toLowerCase()));
  return candidates
    .filter((place) => !excluded.has(place.name.toLowerCase()))
    .map((place) => {
      // place.category is already the best real category we could resolve
      // (deterministic tag match, or AI-classified when that failed) —
      // trusting it directly is what stops a bar from being shown as a park
      // just because "park" happened to be one of the requested buckets.
      const category = place.category;
      const distanceKm = haversineDistanceKm(location, place.location);
      const travelMode: "walk" | "drive" = distanceKm <= 1.5 ? "walk" : "drive";
      return {
        place,
        category,
        distanceKm,
        travelMinutes: estimateTravelMinutes(distanceKm, travelMode),
        travelMode,
        weatherUnfavorable: isWeatherUnfavorableFor(category, badOutdoorWeather),
      };
    })
    .filter((c) => c.distanceKm <= maxDistanceKm)
    .filter((c) =>
      passesPreAIFilters(
        {
          isOpenNow: c.place.isOpenNow,
          rating: c.place.rating,
          reviewCount: c.place.reviewCount,
          travelMinutes: c.travelMinutes,
          wheelchairAccessible: c.place.wheelchairAccessible,
        },
        smartFilters,
      ),
    )
    .sort(
      (a, b) =>
        computeCandidateScore({
          qualityScore: b.place.qualityScore,
          isOpenNow: b.place.isOpenNow,
          weatherUnfavorable: b.weatherUnfavorable,
          distanceKm: b.distanceKm,
        }) -
        computeCandidateScore({
          qualityScore: a.place.qualityScore,
          isOpenNow: a.place.isOpenNow,
          weatherUnfavorable: a.weatherUnfavorable,
          distanceKm: a.distanceKm,
        }),
    )
    .slice(0, poolSize);
}

export async function discoverActivities(
  filters: DiscoverFilters,
  locale: Locale,
): Promise<ActivitySuggestion[]> {
  const resultCount = Math.min(
    MAX_RESULT_COUNT,
    Math.max(MIN_RESULT_COUNT, filters.resultCount ?? 15),
  );
  const smartFilters = filters.smartFilters ?? {};
  const poolSize = Math.min(CANDIDATE_POOL_CAP, Math.max(40, resultCount * 3));

  const [providerResults, weather, forecast] = await Promise.all([
    searchAllProviders({
      categories: filters.categories,
      location: filters.location,
      radiusKm: filters.maxDistanceKm,
      limit: 50,
    }),
    getCurrentWeather(filters.location),
    getHourlyForecast(filters.location).catch((): ForecastPoint[] => []),
  ]);

  const merged = await classifyLowConfidenceCategories(mergePlaceResults(providerResults));
  const badOutdoorWeather = shouldMoveOutdoorActivityIndoors(weather, forecast);

  const ranked = rankedCandidates(
    merged,
    filters.location,
    filters.maxDistanceKm,
    filters.excludePlaceNames ?? [],
    badOutdoorWeather,
    smartFilters,
    poolSize,
  );
  if (ranked.length === 0) {
    return [];
  }

  const hasRatingData = ranked.some((c) => c.place.rating !== null);

  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: AI_MODEL_FAST,
    messages: [
      {
        role: "system",
        content:
          "You suggest specific, appealing activities for a daily planner app, using only the real " +
          "place candidates provided — never invent a place, address, or distance. Some candidates " +
          `include real rating/reviewCount data merged from multiple review sources — when present, ` +
          "strongly prefer candidates with excellent ratings (4.3+) and a healthy number of reviews, and " +
          "avoid recommending poorly rated ones (below 3.5) unless there's no good alternative; when a " +
          "candidate has no rating data at all, judge it only by the other real facts given — never invent " +
          `a rating, review count, or popularity claim for it. Return up to ${resultCount} suggestions — ` +
          "as many good ones as you can find, but never pad the list with weak or redundant picks just to " +
          "hit that number (avoid outdoor picks in rain, prefer them in good weather). Each candidate has " +
          "isOpenNow (true/false/null if hours are unknown), closesAt (today's closing time, when open), " +
          "and weatherUnfavorable (true if it's a mostly-outdoor place and current weather is bad for " +
          "outdoor activities). Strongly prefer candidates that are open now and not weatherUnfavorable — " +
          "only include one that's closed or weather-unfavorable if there's no good alternative among the " +
          "candidates that fits the filters, and if you do, say so plainly in the pitch (e.g. \"closed now, " +
          "reopens tomorrow\") — never imply a closed place is open. Write a short, vivid one-sentence " +
          "pitch per suggestion, in the style of \"Go for a sunset walk in Łazienki Park.\" Also write a " +
          "separate whyRecommended: one short factual sentence citing only the real facts you were given " +
          "for that candidate — distance/travel time, open-now/closing time, weather fit, rating/review " +
          "count when present, or how well it matches the requested budget/duration/indoor-outdoor filters " +
          "(e.g. \"4.7★ from 1,200 reviews, 5 min away, open until 11pm\") — never mention a rating or " +
          "review count that wasn't given to you. Reference each pick by its candidateIndex in the " +
          "provided list." +
          (filters.similarTo
            ? ` The user specifically liked "${filters.similarTo.placeName}" (${filters.similarTo.pitch}) — favor candidates with a similar vibe over maximizing variety.`
            : "") +
          (filters.preferenceHints && filters.preferenceHints.length > 0
            ? ` Also favor candidates that genuinely fit: ${filters.preferenceHints
                .map((h) =>
                  h === "familyFriendly"
                    ? "family-friendly (good for kids)"
                    : h === "petFriendly"
                      ? "pet-friendly"
                      : "romantic (good for a couple)",
                )
                .join(", ")} — judge this from the category and name, never claim a specific amenity (like a kids' menu or pet policy) you weren't told about.`
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
            isOpenNow: c.place.isOpenNow,
            closesAt: c.place.closesAt,
            weatherUnfavorable: c.weatherUnfavorable,
            rating: c.place.rating,
            reviewCount: c.place.reviewCount,
          })),
          hasRatingData,
          requestedResultCount: resultCount,
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
      return {
        title: s.title,
        pitch: s.pitch,
        whyRecommended: s.whyRecommended,
        placeName: candidate.place.name,
        address: candidate.place.address,
        location: candidate.place.location,
        distanceKm: candidate.distanceKm,
        travelMinutes: candidate.travelMinutes,
        travelMode: candidate.travelMode,
        estimatedDurationMinutes: s.estimatedDurationMinutes,
        costTier: s.costTier,
        indoorOutdoor: s.indoorOutdoor,
        weather,
        category: candidate.category,
        openingHours: candidate.place.openingHours,
        website: candidate.place.website,
        isOpenNow: candidate.place.isOpenNow,
        closesAt: candidate.place.closesAt,
        rating: candidate.place.rating,
        reviewCount: candidate.place.reviewCount,
        priceLevel: candidate.place.priceLevel,
        description: candidate.place.description,
        imageUrl: candidate.place.imageUrl,
        wheelchairAccessible: candidate.place.wheelchairAccessible,
        sources: candidate.place.sources,
      };
    })
    .filter((s) => passesPostAIFilters(s, smartFilters))
    .slice(0, resultCount);
}
