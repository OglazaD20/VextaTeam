import { env } from "@/lib/env";
import { inferActivityCategory, searchNearbyPlaces } from "../geoapify-client";
import { getOpeningStatus } from "../opening-hours";
import type { NormalizedPlace, PlaceProvider, PlaceSearchParams } from "./types";

/**
 * Geoapify is the baseline provider — real place candidates with hours,
 * address, website, and phone, but no rating/review data (its free Places
 * API doesn't include reviews). Always available; every other provider is
 * an optional enrichment layer merged on top of this one.
 */
export const geoapifyProvider: PlaceProvider = {
  source: "geoapify",
  isConfigured: () => Boolean(env.PLACES_API_KEY),
  async search({ categories, location, radiusKm, limit }: PlaceSearchParams): Promise<NormalizedPlace[]> {
    const places = await searchNearbyPlaces(categories, location, radiusKm, limit);

    return places.map((place) => {
      const opening = getOpeningStatus(place.openingHours);
      return {
        source: "geoapify",
        sourceId: `${place.name}|${place.location.lat.toFixed(5)}|${place.location.lng.toFixed(5)}`,
        name: place.name,
        category: inferActivityCategory(place.category, categories),
        address: place.address,
        location: place.location,
        openingHours: place.openingHours,
        isOpenNow: opening.isOpenNow,
        closesAt: opening.closesAt,
        website: place.website,
        phone: place.phone,
        rating: null,
        reviewCount: null,
        priceLevel: null,
        description: null,
        imageUrl: null,
        wheelchairAccessible: null,
      };
    });
  },
};
