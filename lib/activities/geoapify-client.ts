import { env } from "@/lib/env";
import type { LatLng } from "./distance";

export { ACTIVITY_CATEGORIES, OUTDOOR_ACTIVITY_CATEGORIES, type ActivityCategory } from "./category-taxonomy";
import { ACTIVITY_CATEGORIES, type ActivityCategory } from "./category-taxonomy";

export interface PlaceCandidate {
  name: string;
  /** All of Geoapify's raw category tags for this place (not just the first) — inferActivityCategory needs the full list to match correctly. */
  category: string[];
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
      category: f.properties.categories ?? [],
      address: f.properties.formatted ?? null,
      location: { lat: f.properties.lat, lng: f.properties.lon },
      openingHours: f.properties.opening_hours ?? null,
      website: f.properties.website ?? null,
      phone: f.properties.phone ?? f.properties.contact?.phone ?? null,
    }));
}

export interface CategoryInference {
  category: ActivityCategory;
  /** "low" means no real tag matched anything in our taxonomy — a last-resort guess that should be re-checked by AI classification rather than trusted. */
  confidence: "high" | "low";
}

/**
 * Geoapify returns every tag a place matched (e.g. ["catering.bar",
 * "catering.pub"]), not which of our requested buckets it came from — and a
 * place can legitimately match a bucket the caller didn't ask for (a bar
 * turning up while searching "restaurants" because they're in the same
 * search radius). Match the real tags against the requested buckets first
 * (most contextually relevant), then fall back to matching against the
 * FULL taxonomy so a place never gets mislabeled just because it wasn't one
 * of the buckets requested — a bar should never be shown as a park. Only
 * when no real tag matches anything at all do we fall back to a guess,
 * flagged low-confidence.
 */
export function inferActivityCategory(
  rawCategories: string[],
  requested: ActivityCategory[],
): CategoryInference {
  for (const bucket of requested) {
    const prefixes = ACTIVITY_CATEGORIES[bucket].split(",");
    if (rawCategories.some((raw) => prefixes.some((prefix) => raw.startsWith(prefix)))) {
      return { category: bucket, confidence: "high" };
    }
  }

  // Prefer the most specific (longest) matching prefix across the whole
  // taxonomy — otherwise a generic umbrella tag like "sport" (active_sports)
  // would shadow a more specific one like "sport.fitness" (gyms) just
  // because it's declared earlier, mislabeling a gym as an "active sports" venue.
  let bestMatch: { bucket: ActivityCategory; prefixLength: number } | null = null;
  for (const [bucket, categoryString] of Object.entries(ACTIVITY_CATEGORIES) as [ActivityCategory, string][]) {
    for (const prefix of categoryString.split(",")) {
      if (rawCategories.some((raw) => raw.startsWith(prefix)) && (!bestMatch || prefix.length > bestMatch.prefixLength)) {
        bestMatch = { bucket, prefixLength: prefix.length };
      }
    }
  }
  if (bestMatch) {
    return { category: bestMatch.bucket, confidence: "high" };
  }

  return { category: requested[0], confidence: "low" };
}

export interface GeocodeResult {
  formatted: string;
  location: LatLng;
}

/** Forward geocoding — turns a typed place/address into candidate locations, for "search another location" on the map. */
export async function geocodeLocation(query: string, limit = 5): Promise<GeocodeResult[]> {
  if (!env.PLACES_API_KEY) {
    throw new Error("PLACES_API_KEY is not set. Location search is unavailable until it's configured.");
  }

  const url = new URL("https://api.geoapify.com/v1/geocode/search");
  url.searchParams.set("text", query);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("apiKey", env.PLACES_API_KEY);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Location search failed with status ${response.status}`);
  }

  const data: { features?: GeoapifyFeature[] } = await response.json();
  return (data.features ?? [])
    .filter((f) => f.properties.formatted)
    .map((f) => ({
      formatted: f.properties.formatted!,
      location: { lat: f.properties.lat, lng: f.properties.lon },
    }));
}

export function buildGeoapifyTileUrl(style: string, z: number, x: number, y: number): string {
  const url = new URL(`https://maps.geoapify.com/v1/tile/${style}/${z}/${x}/${y}.png`);
  url.searchParams.set("apiKey", env.PLACES_API_KEY ?? "");
  return url.toString();
}

export function buildStaticMapUrl(location: LatLng, width = 400, height = 200): string {
  const url = new URL("https://maps.geoapify.com/v1/staticmap");
  url.searchParams.set("style", "osm-bright");
  url.searchParams.set("width", String(width));
  url.searchParams.set("height", String(height));
  url.searchParams.set("center", `lonlat:${location.lng},${location.lat}`);
  url.searchParams.set("zoom", "14");
  url.searchParams.set("marker", `lonlat:${location.lng},${location.lat};color:#ff5a5f;size:medium`);
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

  // Geoapify expects multiple pins as ONE marker param, pipe-separated —
  // repeated &marker=&marker= params get parsed as an array and rejected
  // with a 400 ("marker[0][1]" does not match any of the allowed types).
  // Colors use a literal "#" (not pre-encoded "%23") — URLSearchParams
  // encodes it exactly once; pre-encoding double-encodes it to "%2523",
  // which Geoapify's marker parser rejects outright.
  const markerDescriptors = points
    .slice(0, 40)
    .map(
      (point) =>
        `lonlat:${point.location.lng},${point.location.lat};color:#${point.color ?? "3b82f6"};size:small`,
    );
  markerDescriptors.push(`lonlat:${center.lng},${center.lat};color:#ff5a5f;size:medium`);
  url.searchParams.set("marker", markerDescriptors.join("|"));
  url.searchParams.set("apiKey", env.PLACES_API_KEY ?? "");
  return url.toString();
}
