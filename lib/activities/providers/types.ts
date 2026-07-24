import type { ActivityCategory } from "../category-taxonomy";
import type { LatLng } from "../distance";

export type PlaceSource = "geoapify" | "google" | "tripadvisor";

/**
 * A place candidate normalized to a common shape regardless of which
 * provider it came from, so the merge step (merge-places.ts) can combine
 * matching places across sources without any provider-specific branching.
 * Fields a provider doesn't supply are left null — never guessed.
 */
export interface NormalizedPlace {
  source: PlaceSource;
  sourceId: string;
  name: string;
  category: ActivityCategory;
  /** "low" means the category was a last-resort guess (no real tag matched anything in our taxonomy) — a candidate for batched AI classification rather than a trustworthy label. */
  categoryConfidence: "high" | "low";
  address: string | null;
  location: LatLng;
  openingHours: string | null;
  isOpenNow: boolean | null;
  /** Today's closing time, when known and currently open — computed deterministically, never guessed. */
  closesAt: string | null;
  website: string | null;
  phone: string | null;
  /** 0-5, from the provider's own review data — never estimated. */
  rating: number | null;
  reviewCount: number | null;
  /** 0 (free) to 4 (very expensive), Google-style price level, when the provider reports one. */
  priceLevel: number | null;
  description: string | null;
  imageUrl: string | null;
  wheelchairAccessible: boolean | null;
}

export interface PlaceSearchParams {
  categories: ActivityCategory[];
  location: LatLng;
  radiusKm: number;
  limit: number;
}

export interface PlaceProvider {
  source: PlaceSource;
  isConfigured(): boolean;
  search(params: PlaceSearchParams): Promise<NormalizedPlace[]>;
}
