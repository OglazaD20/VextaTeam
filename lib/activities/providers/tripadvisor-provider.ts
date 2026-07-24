import { env } from "@/lib/env";
import { ACTIVITY_CATEGORY_LABEL } from "../category-style";
import type { ActivityCategory } from "../category-taxonomy";
import type { NormalizedPlace, PlaceProvider, PlaceSearchParams } from "./types";

/** TripAdvisor's Content API only buckets by these coarse categories. */
const TRIPADVISOR_CATEGORY: Partial<Record<ActivityCategory, "restaurants" | "attractions">> = {
  restaurants: "restaurants",
  coffee: "restaurants",
  desserts: "restaurants",
  bars: "restaurants",
  museums: "attractions",
  galleries: "attractions",
  parks: "attractions",
  lakes_beaches: "attractions",
  attractions: "attractions",
  zoos_aquariums: "attractions",
  family: "attractions",
  cinema: "attractions",
  gaming: "attractions",
};

interface TripAdvisorSearchResult {
  location_id: string;
  name: string;
  address_obj?: { address_string?: string };
  latitude?: string;
  longitude?: string;
}

interface TripAdvisorSearchResponse {
  data?: TripAdvisorSearchResult[];
}

interface TripAdvisorDetails {
  location_id: string;
  rating?: string;
  num_reviews?: string;
  price_level?: string;
  description?: string;
  web_url?: string;
  phone?: string;
}

/**
 * Quality-signal enrichment provider — TripAdvisor ratings/review counts
 * for restaurants and attractions, when TRIPADVISOR_API_KEY is configured.
 * Best-effort throughout: the Content API's exact response shape can't be
 * verified without a live key, so every call is wrapped and any failure
 * just yields no TripAdvisor signal rather than breaking Discover.
 */
export const tripAdvisorProvider: PlaceProvider = {
  source: "tripadvisor",
  isConfigured: () => Boolean(env.TRIPADVISOR_API_KEY),
  async search({ categories, location, limit }: PlaceSearchParams): Promise<NormalizedPlace[]> {
    if (!env.TRIPADVISOR_API_KEY) return [];

    const taCategory = categories.map((c) => TRIPADVISOR_CATEGORY[c]).find(Boolean);
    if (!taCategory) return [];

    // TripAdvisor's Content API only buckets into "restaurants"/"attractions" —
    // far coarser than our taxonomy. When more than one of our categories maps
    // onto the same TripAdvisor bucket, picking the first requested one is a
    // genuine guess, so flag it low-confidence for AI reclassification.
    const bucketAmbiguous =
      Object.values(TRIPADVISOR_CATEGORY).filter((c) => c === taCategory).length > 1;
    const resultCategory = categories[0];

    try {
      const searchUrl = new URL("https://api.content.tripadvisor.com/api/v1/location/search");
      searchUrl.searchParams.set("key", env.TRIPADVISOR_API_KEY);
      searchUrl.searchParams.set("latLong", `${location.lat},${location.lng}`);
      searchUrl.searchParams.set("category", taCategory);
      searchUrl.searchParams.set(
        "searchQuery",
        categories.map((c) => ACTIVITY_CATEGORY_LABEL[c]).join(" "),
      );
      searchUrl.searchParams.set("language", "en");

      const searchResponse = await fetch(searchUrl.toString(), {
        headers: { Accept: "application/json" },
      });
      if (!searchResponse.ok) return [];

      const searchData: TripAdvisorSearchResponse = await searchResponse.json();
      const candidates = (searchData.data ?? []).slice(0, Math.min(limit, 20));

      const details = await Promise.all(
        candidates.map(async (candidate) => {
          try {
            const detailsUrl = new URL(
              `https://api.content.tripadvisor.com/api/v1/location/${candidate.location_id}/details`,
            );
            detailsUrl.searchParams.set("key", env.TRIPADVISOR_API_KEY!);
            detailsUrl.searchParams.set("language", "en");
            const detailsResponse = await fetch(detailsUrl.toString(), {
              headers: { Accept: "application/json" },
            });
            if (!detailsResponse.ok) return null;
            return (await detailsResponse.json()) as TripAdvisorDetails;
          } catch {
            return null;
          }
        }),
      );

      const detailsById = new Map(details.filter((d): d is TripAdvisorDetails => d !== null).map((d) => [d.location_id, d]));

      return candidates
        .filter((c) => c.latitude && c.longitude)
        .map((c) => {
          const detail = detailsById.get(c.location_id);
          return {
            source: "tripadvisor" as const,
            sourceId: c.location_id,
            name: c.name,
            category: resultCategory,
            categoryConfidence: bucketAmbiguous ? "low" : "high",
            address: c.address_obj?.address_string ?? null,
            location: { lat: Number(c.latitude), lng: Number(c.longitude) },
            openingHours: null,
            isOpenNow: null,
            closesAt: null,
            website: detail?.web_url ?? null,
            phone: detail?.phone ?? null,
            rating: detail?.rating ? Number(detail.rating) : null,
            reviewCount: detail?.num_reviews ? Number(detail.num_reviews) : null,
            priceLevel: detail?.price_level ? detail.price_level.length : null,
            description: detail?.description ?? null,
            imageUrl: null,
            wheelchairAccessible: null,
          };
        });
    } catch {
      return [];
    }
  },
};
