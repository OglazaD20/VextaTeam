import { OUTDOOR_ACTIVITY_CATEGORIES, type ActivityCategory } from "./category-taxonomy";

/** True for a category whose venues are predominantly outdoors and weather is currently unfavorable for them. */
export function isWeatherUnfavorableFor(category: ActivityCategory, badOutdoorWeather: boolean): boolean {
  return badOutdoorWeather && OUTDOOR_ACTIVITY_CATEGORIES.has(category);
}

/**
 * Every filter is optional; combine as many as the user wants. Filters that
 * depend on data no provider supplied (e.g. minRating with no rating data
 * at all) never exclude a candidate outright — an unknown value is treated
 * as "can't rule it out," not "fails the filter," so Discover degrades
 * gracefully without Google/TripAdvisor keys configured.
 */
export interface DiscoverSmartFilters {
  openOnly?: boolean;
  minRating?: number;
  maxTravelMinutes?: number;
  wheelchairAccessible?: boolean;
  popular?: boolean;
  hiddenGems?: boolean;
  freeOnly?: boolean;
  luxury?: boolean;
  fastVisit?: boolean;
  longActivities?: boolean;
}

const POPULAR_REVIEW_THRESHOLD = 200;
const HIDDEN_GEM_REVIEW_CEILING = 50;
const HIDDEN_GEM_MIN_RATING = 4.3;

/** Deterministic candidate-level filtering, applied before the AI ever sees the list. */
export function passesPreAIFilters(
  candidate: {
    isOpenNow: boolean | null;
    rating: number | null;
    reviewCount: number | null;
    travelMinutes: number;
    wheelchairAccessible: boolean | null;
  },
  filters: DiscoverSmartFilters,
): boolean {
  if (filters.openOnly && candidate.isOpenNow === false) return false;
  if (filters.minRating !== undefined && candidate.rating !== null && candidate.rating < filters.minRating) {
    return false;
  }
  if (filters.maxTravelMinutes !== undefined && candidate.travelMinutes > filters.maxTravelMinutes) {
    return false;
  }
  if (filters.wheelchairAccessible && candidate.wheelchairAccessible === false) return false;
  if (
    filters.popular &&
    candidate.reviewCount !== null &&
    candidate.reviewCount < POPULAR_REVIEW_THRESHOLD
  ) {
    return false;
  }
  if (filters.hiddenGems && candidate.reviewCount !== null) {
    const looksLikeAGem =
      candidate.reviewCount <= HIDDEN_GEM_REVIEW_CEILING &&
      (candidate.rating === null || candidate.rating >= HIDDEN_GEM_MIN_RATING);
    if (!looksLikeAGem) return false;
  }
  return true;
}

/** Filters that only make sense against the AI's own output (cost tier, duration). */
export function passesPostAIFilters(
  suggestion: { costTier: "free" | "low" | "medium" | "high"; estimatedDurationMinutes: number },
  filters: DiscoverSmartFilters,
): boolean {
  if (filters.freeOnly && suggestion.costTier !== "free") return false;
  if (filters.luxury && suggestion.costTier !== "high") return false;
  if (filters.fastVisit && suggestion.estimatedDurationMinutes > 60) return false;
  if (filters.longActivities && suggestion.estimatedDurationMinutes < 120) return false;
  return true;
}

/**
 * Single composite ranking score used to sort candidates before handing
 * them to the AI: open/weather-favorable places always rank ahead of
 * closed/unfavorable ones, then rated quality dominates among the rest,
 * with distance as a final tiebreaker. Pure and deterministic — the AI
 * still makes the final picks, this just orders what it sees.
 */
export function computeCandidateScore(candidate: {
  qualityScore: number;
  isOpenNow: boolean | null;
  weatherUnfavorable: boolean;
  distanceKm: number;
}): number {
  const closedPenalty = candidate.isOpenNow === false ? 1000 : 0;
  const weatherPenalty = candidate.weatherUnfavorable ? 500 : 0;
  return candidate.qualityScore * 10 - closedPenalty - weatherPenalty - candidate.distanceKm * 2;
}
