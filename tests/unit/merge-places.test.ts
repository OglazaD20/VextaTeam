import { describe, expect, it } from "vitest";

import { computeQualityScore, mergePlaceResults } from "@/lib/activities/providers/merge-places";
import type { NormalizedPlace } from "@/lib/activities/providers/types";

function place(overrides: Partial<NormalizedPlace> = {}): NormalizedPlace {
  return {
    source: "geoapify",
    sourceId: "1",
    name: "Cafe Central",
    category: "coffee",
    address: "123 Main St",
    location: { lat: 52.23, lng: 21.01 },
    openingHours: null,
    isOpenNow: null,
    closesAt: null,
    website: null,
    phone: null,
    rating: null,
    reviewCount: null,
    priceLevel: null,
    description: null,
    imageUrl: null,
    wheelchairAccessible: null,
    ...overrides,
  };
}

describe("mergePlaceResults", () => {
  it("merges the same place found by two providers into one entry", () => {
    const geoapify = place({ source: "geoapify", name: "Cafe Central", openingHours: "Mo-Fr 08:00-18:00" });
    const google = place({
      source: "google",
      sourceId: "g1",
      name: "Cafe Central",
      location: { lat: 52.2301, lng: 21.0101 },
      rating: 4.5,
      reviewCount: 200,
      imageUrl: "https://example.com/photo.jpg",
    });

    const merged = mergePlaceResults([[geoapify], [google]]);

    expect(merged).toHaveLength(1);
    expect(merged[0].sources).toEqual(expect.arrayContaining(["geoapify", "google"]));
    expect(merged[0].openingHours).toBe("Mo-Fr 08:00-18:00");
    expect(merged[0].rating).toBe(4.5);
    expect(merged[0].reviewCount).toBe(200);
    expect(merged[0].imageUrl).toBe("https://example.com/photo.jpg");
  });

  it("keeps distinct places separate", () => {
    const a = place({ name: "Cafe Central", location: { lat: 52.23, lng: 21.01 } });
    const b = place({ name: "Book Nook", sourceId: "2", location: { lat: 52.5, lng: 21.5 } });

    const merged = mergePlaceResults([[a, b]]);
    expect(merged).toHaveLength(2);
  });

  it("review-count-weights a merged rating across two sources", () => {
    const google = place({ source: "google", name: "Park View", rating: 4.0, reviewCount: 10 });
    const tripadvisor = place({
      source: "tripadvisor",
      sourceId: "t1",
      name: "Park View",
      rating: 5.0,
      reviewCount: 90,
    });

    const merged = mergePlaceResults([[google], [tripadvisor]]);
    // Weighted: (4*10 + 5*90) / 100 = 4.9
    expect(merged[0].rating).toBe(4.9);
    expect(merged[0].reviewCount).toBe(100);
  });

  it("leaves rating null when no provider has one", () => {
    const merged = mergePlaceResults([[place()]]);
    expect(merged[0].rating).toBeNull();
    expect(merged[0].qualityScore).toBe(0);
  });
});

describe("computeQualityScore", () => {
  it("is 0 when there's no rating", () => {
    expect(computeQualityScore({ rating: null, reviewCount: null, sourceCount: 1 })).toBe(0);
  });

  it("rewards more reviews behind the same rating", () => {
    const fewReviews = computeQualityScore({ rating: 4.5, reviewCount: 5, sourceCount: 1 });
    const manyReviews = computeQualityScore({ rating: 4.5, reviewCount: 5000, sourceCount: 1 });
    expect(manyReviews).toBeGreaterThan(fewReviews);
  });

  it("gives a small bonus for multi-source confirmation", () => {
    const single = computeQualityScore({ rating: 4.5, reviewCount: 100, sourceCount: 1 });
    const multi = computeQualityScore({ rating: 4.5, reviewCount: 100, sourceCount: 2 });
    expect(multi).toBeGreaterThan(single);
  });

  it("never lets review count alone beat a much higher rating", () => {
    const highRatingFewReviews = computeQualityScore({ rating: 4.9, reviewCount: 20, sourceCount: 1 });
    const lowRatingManyReviews = computeQualityScore({ rating: 3.0, reviewCount: 100000, sourceCount: 1 });
    expect(highRatingFewReviews).toBeGreaterThan(lowRatingManyReviews);
  });
});
