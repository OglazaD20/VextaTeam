import { env } from "@/lib/env";
import type { CategoryInference } from "../geoapify-client";
import type { ActivityCategory } from "../category-taxonomy";
import type { NormalizedPlace, PlaceProvider, PlaceSearchParams } from "./types";

/**
 * Best-effort mapping from our category taxonomy to Google's Nearby Search
 * "type" parameter (https://developers.google.com/maps/documentation/places/web-service/supported_types).
 * Only one type can be requested per Nearby Search call, so we use the
 * closest single match — Google's `keyword` param isn't a reliable enough
 * category filter to combine with `type` here.
 */
const GOOGLE_PLACE_TYPE: Record<ActivityCategory, string> = {
  restaurants: "restaurant",
  coffee: "cafe",
  desserts: "bakery",
  bars: "bar",
  nightlife: "night_club",
  museums: "museum",
  galleries: "art_gallery",
  parks: "park",
  lakes_beaches: "tourist_attraction",
  attractions: "tourist_attraction",
  active_sports: "stadium",
  gyms: "gym",
  pools: "gym",
  golf: "tourist_attraction",
  shopping: "shopping_mall",
  bookstores: "book_store",
  libraries: "library",
  coworking: "tourist_attraction",
  cinema: "movie_theater",
  gaming: "bowling_alley",
  zoos_aquariums: "zoo",
  family: "amusement_park",
  learning: "museum",
  relax: "spa",
};

/** Reverse of GOOGLE_PLACE_TYPE — a Google type can map to more than one of our categories (e.g. "gym" covers both gyms and pools). */
const GOOGLE_TYPE_TO_CATEGORIES: Partial<Record<string, ActivityCategory[]>> = {};
for (const [category, type] of Object.entries(GOOGLE_PLACE_TYPE) as [ActivityCategory, string][]) {
  (GOOGLE_TYPE_TO_CATEGORIES[type] ??= []).push(category);
}

interface GoogleNearbySearchResult {
  place_id: string;
  name: string;
  vicinity?: string;
  geometry?: { location?: { lat: number; lng: number } };
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  opening_hours?: { open_now?: boolean };
  photos?: { photo_reference: string }[];
  business_status?: string;
  /** Google's own type tags for the place — the real signal for category, unlike the single type we queried with. */
  types?: string[];
}

/**
 * Google's Nearby Search is queried with a single `type`, but every result
 * carries its own real `types` array — using that (instead of blindly
 * trusting the query type) is what stops e.g. a museum surfacing under a
 * "restaurant" search from being mislabeled as a restaurant.
 */
function inferGoogleCategory(
  types: string[] | undefined,
  requested: ActivityCategory[],
  queriedCategory: ActivityCategory,
): CategoryInference {
  const candidates = new Set<ActivityCategory>();
  for (const type of types ?? []) {
    for (const category of GOOGLE_TYPE_TO_CATEGORIES[type] ?? []) candidates.add(category);
  }

  for (const bucket of requested) {
    if (candidates.has(bucket)) return { category: bucket, confidence: "high" };
  }
  if (candidates.size === 1) {
    return { category: [...candidates][0], confidence: "high" };
  }

  // Either Google gave no usable type, or several equally plausible buckets
  // with none matching what was requested — genuinely ambiguous from real
  // data alone, so flag it for AI classification rather than guess.
  return { category: queriedCategory, confidence: "low" };
}

interface GoogleNearbySearchResponse {
  results?: GoogleNearbySearchResult[];
  status: string;
}

function buildPhotoUrl(photoReference: string, maxWidth = 640): string {
  const url = new URL("https://maps.googleapis.com/maps/api/place/photo");
  url.searchParams.set("photoreference", photoReference);
  url.searchParams.set("maxwidth", String(maxWidth));
  url.searchParams.set("key", env.GOOGLE_PLACES_API_KEY ?? "");
  return url.toString();
}

/**
 * Enrichment provider — adds ratings, review counts, price level, and
 * photos when GOOGLE_PLACES_API_KEY is configured. Inactive (returns [])
 * otherwise, so Discover works fully without it.
 */
export const googlePlacesProvider: PlaceProvider = {
  source: "google",
  isConfigured: () => Boolean(env.GOOGLE_PLACES_API_KEY),
  async search({ categories, location, radiusKm, limit }: PlaceSearchParams): Promise<NormalizedPlace[]> {
    if (!env.GOOGLE_PLACES_API_KEY) return [];

    const type = GOOGLE_PLACE_TYPE[categories[0]];
    if (!type) return [];

    const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
    url.searchParams.set("location", `${location.lat},${location.lng}`);
    url.searchParams.set("radius", String(Math.round(Math.max(200, radiusKm * 1000))));
    url.searchParams.set("type", type);
    url.searchParams.set("key", env.GOOGLE_PLACES_API_KEY);

    const response = await fetch(url.toString());
    if (!response.ok) return [];

    const data: GoogleNearbySearchResponse = await response.json();
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") return [];

    return (data.results ?? [])
      .filter((r) => r.geometry?.location && r.business_status !== "CLOSED_PERMANENTLY")
      .slice(0, limit)
      .map((r) => {
        const inferred = inferGoogleCategory(r.types, categories, categories[0]);
        return {
          source: "google" as const,
          sourceId: r.place_id,
          name: r.name,
          category: inferred.category,
          categoryConfidence: inferred.confidence,
          address: r.vicinity ?? null,
          location: { lat: r.geometry!.location!.lat, lng: r.geometry!.location!.lng },
          openingHours: null,
          isOpenNow: r.opening_hours?.open_now ?? null,
          closesAt: null,
          website: null,
          phone: null,
          rating: r.rating ?? null,
          reviewCount: r.user_ratings_total ?? null,
          priceLevel: r.price_level ?? null,
          description: null,
          imageUrl: r.photos?.[0] ? buildPhotoUrl(r.photos[0].photo_reference) : null,
          wheelchairAccessible: null,
        };
      });
  },
};
