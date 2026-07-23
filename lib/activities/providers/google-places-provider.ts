import { env } from "@/lib/env";
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
      .map((r) => ({
        source: "google" as const,
        sourceId: r.place_id,
        name: r.name,
        category: categories[0],
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
      }));
  },
};
