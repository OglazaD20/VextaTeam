import { env } from "@/lib/env";
import type { LatLng } from "./distance";

/** User-facing activity categories mapped to Geoapify's Places category taxonomy. */
export const ACTIVITY_CATEGORIES = {
  food_drink: "catering.restaurant,catering.cafe,catering.bar",
  outdoors: "leisure.park,natural",
  culture: "entertainment.museum,tourism.attraction,entertainment.culture",
  active: "sport",
  relax: "leisure.spa,catering.cafe",
  social: "entertainment,catering.bar",
} as const;

export type ActivityCategory = keyof typeof ACTIVITY_CATEGORIES;

export interface PlaceCandidate {
  name: string;
  category: string;
  address: string | null;
  location: LatLng;
}

interface GeoapifyFeature {
  properties: {
    name?: string;
    formatted?: string;
    categories?: string[];
    lat: number;
    lon: number;
  };
}

export async function searchNearbyPlaces(
  categories: ActivityCategory[],
  location: LatLng,
  radiusKm: number,
  limit = 20,
): Promise<PlaceCandidate[]> {
  if (!env.PLACES_API_KEY) {
    throw new Error("PLACES_API_KEY is not set. Activity discovery is unavailable until it's configured.");
  }

  const categoryString = categories.map((c) => ACTIVITY_CATEGORIES[c]).join(",");
  const radiusMeters = Math.round(Math.max(0.2, radiusKm) * 1000);

  const url = new URL("https://api.geoapify.com/v2/places");
  url.searchParams.set("categories", categoryString);
  url.searchParams.set("filter", `circle:${location.lng},${location.lat},${radiusMeters}`);
  url.searchParams.set("bias", `proximity:${location.lng},${location.lat}`);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("apiKey", env.PLACES_API_KEY);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Places search failed with status ${response.status}`);
  }

  const data: { features?: GeoapifyFeature[] } = await response.json();

  return (data.features ?? [])
    .filter((f) => f.properties.name)
    .map((f) => ({
      name: f.properties.name!,
      category: f.properties.categories?.[0] ?? "unknown",
      address: f.properties.formatted ?? null,
      location: { lat: f.properties.lat, lng: f.properties.lon },
    }));
}

export function buildStaticMapUrl(location: LatLng, width = 400, height = 200): string {
  const url = new URL("https://maps.geoapify.com/v1/staticmap");
  url.searchParams.set("style", "osm-bright");
  url.searchParams.set("width", String(width));
  url.searchParams.set("height", String(height));
  url.searchParams.set("center", `lonlat:${location.lng},${location.lat}`);
  url.searchParams.set("zoom", "14");
  url.searchParams.set("marker", `lonlat:${location.lng},${location.lat};color:%23ff5a5f;size:medium`);
  url.searchParams.set("apiKey", env.PLACES_API_KEY ?? "");
  return url.toString();
}
