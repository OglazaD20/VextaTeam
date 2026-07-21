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
  entertainment: "entertainment.cinema,entertainment.theme_park,entertainment.zoo,entertainment.aquarium",
  nightlife: "entertainment.nightclub,entertainment.casino,catering.bar",
  shopping: "commercial.shopping_mall,commercial",
  adventure: "sport,natural",
  gaming: "entertainment.bowling_alley,entertainment.miniature_golf,entertainment.escape_game",
  learning: "education,entertainment.museum",
  family: "leisure.playground,entertainment.zoo,entertainment.theme_park",
} as const;

export type ActivityCategory = keyof typeof ACTIVITY_CATEGORIES;

export interface PlaceCandidate {
  name: string;
  category: string;
  address: string | null;
  location: LatLng;
  openingHours: string | null;
  website: string | null;
  phone: string | null;
}

interface GeoapifyFeature {
  properties: {
    name?: string;
    formatted?: string;
    categories?: string[];
    lat: number;
    lon: number;
    opening_hours?: string;
    website?: string;
    phone?: string;
    contact?: { phone?: string };
  };
}

export async function searchNearbyPlaces(
  categories: ActivityCategory[],
  location: LatLng,
  radiusKm: number,
  limit = 50,
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
      openingHours: f.properties.opening_hours ?? null,
      website: f.properties.website ?? null,
      phone: f.properties.phone ?? f.properties.contact?.phone ?? null,
    }));
}

/**
 * Geoapify only tells us the specific leaf category of a matched place (e.g.
 * "catering.restaurant.pizza"), not which of our requested buckets it came
 * from. Match it back by prefix against each requested bucket's category
 * list so suggestions can be tagged with a single ActivityCategory.
 */
export function inferActivityCategory(
  rawCategory: string,
  requested: ActivityCategory[],
): ActivityCategory {
  for (const bucket of requested) {
    const prefixes = ACTIVITY_CATEGORIES[bucket].split(",");
    if (prefixes.some((prefix) => rawCategory.startsWith(prefix))) {
      return bucket;
    }
  }
  return requested[0];
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

/** Picks a zoom level that roughly fits everything within radiusKm of the center. */
function estimateZoomForRadiusKm(radiusKm: number): number {
  if (radiusKm <= 0.5) return 15;
  if (radiusKm <= 1) return 14;
  if (radiusKm <= 2) return 13;
  if (radiusKm <= 4) return 12;
  if (radiusKm <= 8) return 11;
  if (radiusKm <= 15) return 10;
  if (radiusKm <= 30) return 9;
  if (radiusKm <= 60) return 8;
  return 7;
}

/** Overview map with a pin per activity/event plus a distinct marker for the search origin. */
export function buildOverviewStaticMapUrl(
  center: LatLng,
  points: { location: LatLng; color?: string }[],
  width = 640,
  height = 320,
): string {
  const farthestKm = points.reduce((max, p) => {
    const dLat = p.location.lat - center.lat;
    const dLng = p.location.lng - center.lng;
    // Rough planar distance is plenty for picking a zoom level.
    const approxKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111;
    return Math.max(max, approxKm);
  }, 0.3);

  const url = new URL("https://maps.geoapify.com/v1/staticmap");
  url.searchParams.set("style", "osm-bright");
  url.searchParams.set("width", String(width));
  url.searchParams.set("height", String(height));
  url.searchParams.set("center", `lonlat:${center.lng},${center.lat}`);
  url.searchParams.set("zoom", String(estimateZoomForRadiusKm(farthestKm)));

  for (const point of points.slice(0, 40)) {
    url.searchParams.append(
      "marker",
      `lonlat:${point.location.lng},${point.location.lat};color:%23${point.color ?? "3b82f6"};size:small`,
    );
  }
  url.searchParams.append("marker", `lonlat:${center.lng},${center.lat};color:%23ff5a5f;size:medium`);
  url.searchParams.set("apiKey", env.PLACES_API_KEY ?? "");
  return url.toString();
}
