import { haversineDistanceKm } from "../distance";
import type { NormalizedPlace, PlaceSource } from "./types";

export interface MergedPlace {
  name: string;
  category: NormalizedPlace["category"];
  address: string | null;
  location: NormalizedPlace["location"];
  openingHours: string | null;
  isOpenNow: boolean | null;
  closesAt: string | null;
  website: string | null;
  phone: string | null;
  rating: number | null;
  reviewCount: number | null;
  priceLevel: number | null;
  description: string | null;
  imageUrl: string | null;
  wheelchairAccessible: boolean | null;
  sources: PlaceSource[];
  /** Deterministic 0-5+ ranking score from rating/review-count/multi-source confirmation — never AI-assigned. */
  qualityScore: number;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function namesLikelyMatch(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  return na.length >= 4 && nb.length >= 4 && (na.includes(nb) || nb.includes(na));
}

/** Same real-world place if provider results are within ~75m and their names plausibly match. */
function isSamePlace(a: NormalizedPlace, b: NormalizedPlace): boolean {
  return haversineDistanceKm(a.location, b.location) <= 0.075 && namesLikelyMatch(a.name, b.name);
}

/**
 * Confidence-weighted quality score: more reviews behind a rating means
 * more trust in it (log-scaled so it plateaus rather than letting a place
 * with 50,000 reviews infinitely dominate one with 500), plus a small bonus
 * when multiple independent sources agree the place exists and is good.
 * Returns 0 for places with no rating data at all — those fall back to the
 * existing distance/hours/weather ranking instead.
 */
export function computeQualityScore(input: {
  rating: number | null;
  reviewCount: number | null;
  sourceCount: number;
}): number {
  if (input.rating === null) return 0;
  const reviewWeight = input.reviewCount ? Math.min(1, Math.log10(input.reviewCount + 1) / 3) : 0.2;
  const multiSourceBonus = input.sourceCount > 1 ? 0.15 : 0;
  return Math.round((input.rating * (0.5 + 0.5 * reviewWeight) + multiSourceBonus) * 100) / 100;
}

function mergeCluster(cluster: NormalizedPlace[]): MergedPlace {
  const base = cluster.find((c) => c.source === "geoapify") ?? cluster[0];
  const rated = cluster.filter(
    (c): c is NormalizedPlace & { rating: number } => c.rating !== null,
  );

  let rating: number | null = null;
  let reviewCount: number | null = null;
  if (rated.length > 0) {
    const withCounts = rated.filter((c) => c.reviewCount !== null) as (NormalizedPlace & {
      rating: number;
      reviewCount: number;
    })[];
    if (withCounts.length > 0) {
      const totalReviews = withCounts.reduce((sum, c) => sum + c.reviewCount, 0);
      rating =
        totalReviews > 0
          ? Math.round((withCounts.reduce((sum, c) => sum + c.rating * c.reviewCount, 0) / totalReviews) * 10) / 10
          : Math.round((withCounts.reduce((sum, c) => sum + c.rating, 0) / withCounts.length) * 10) / 10;
      reviewCount = totalReviews;
    } else {
      rating = Math.round((rated.reduce((sum, c) => sum + c.rating, 0) / rated.length) * 10) / 10;
    }
  }

  const sources = [...new Set(cluster.map((c) => c.source))];

  return {
    name: base.name,
    category: base.category,
    address: cluster.find((c) => c.address)?.address ?? null,
    location: base.location,
    openingHours: cluster.find((c) => c.openingHours)?.openingHours ?? null,
    isOpenNow: cluster.find((c) => c.isOpenNow !== null)?.isOpenNow ?? null,
    closesAt: cluster.find((c) => c.closesAt)?.closesAt ?? null,
    website: cluster.find((c) => c.website)?.website ?? null,
    phone: cluster.find((c) => c.phone)?.phone ?? null,
    rating,
    reviewCount,
    priceLevel: cluster.find((c) => c.priceLevel !== null)?.priceLevel ?? null,
    description:
      cluster
        .map((c) => c.description)
        .filter((d): d is string => Boolean(d))
        .sort((a, b) => b.length - a.length)[0] ?? null,
    imageUrl: cluster.find((c) => c.imageUrl)?.imageUrl ?? null,
    wheelchairAccessible: cluster.find((c) => c.wheelchairAccessible !== null)?.wheelchairAccessible ?? null,
    sources,
    qualityScore: computeQualityScore({ rating, reviewCount, sourceCount: sources.length }),
  };
}

/**
 * Combines candidates from every configured provider into one deduplicated
 * list. When the same real place appears from multiple sources, ratings are
 * merged as a review-count-weighted average, review counts are summed, and
 * the richest description/website/phone/photo across sources wins.
 */
export function mergePlaceResults(resultsBySource: NormalizedPlace[][]): MergedPlace[] {
  const all = resultsBySource.flat();
  const clusters: NormalizedPlace[][] = [];

  for (const place of all) {
    const cluster = clusters.find((c) => c.some((existing) => isSamePlace(existing, place)));
    if (cluster) {
      cluster.push(place);
    } else {
      clusters.push([place]);
    }
  }

  return clusters.map(mergeCluster);
}
