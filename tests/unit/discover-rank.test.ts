import { describe, expect, it } from "vitest";

import {
  computeCandidateScore,
  isWeatherUnfavorableFor,
  passesPostAIFilters,
  passesPreAIFilters,
} from "@/lib/activities/rank";

describe("isWeatherUnfavorableFor", () => {
  it("is true for an outdoor category when the weather is bad for outdoors", () => {
    expect(isWeatherUnfavorableFor("parks", true)).toBe(true);
    expect(isWeatherUnfavorableFor("lakes_beaches", true)).toBe(true);
  });

  it("is false for an outdoor category when the weather is fine", () => {
    expect(isWeatherUnfavorableFor("parks", false)).toBe(false);
  });

  it("is false for an indoor category regardless of weather", () => {
    expect(isWeatherUnfavorableFor("museums", true)).toBe(false);
    expect(isWeatherUnfavorableFor("cinema", true)).toBe(false);
  });
});

function candidate(overrides: Partial<Parameters<typeof passesPreAIFilters>[0]> = {}) {
  return {
    isOpenNow: null,
    rating: null,
    reviewCount: null,
    travelMinutes: 10,
    wheelchairAccessible: null,
    ...overrides,
  };
}

describe("passesPreAIFilters", () => {
  it("excludes closed places when openOnly is set", () => {
    expect(passesPreAIFilters(candidate({ isOpenNow: false }), { openOnly: true })).toBe(false);
    expect(passesPreAIFilters(candidate({ isOpenNow: true }), { openOnly: true })).toBe(true);
  });

  it("does not exclude unknown-hours places when openOnly is set", () => {
    expect(passesPreAIFilters(candidate({ isOpenNow: null }), { openOnly: true })).toBe(true);
  });

  it("excludes places below minRating only when a rating is known", () => {
    expect(passesPreAIFilters(candidate({ rating: 3.2 }), { minRating: 4 })).toBe(false);
    expect(passesPreAIFilters(candidate({ rating: 4.5 }), { minRating: 4 })).toBe(true);
    expect(passesPreAIFilters(candidate({ rating: null }), { minRating: 4 })).toBe(true);
  });

  it("excludes places over maxTravelMinutes", () => {
    expect(passesPreAIFilters(candidate({ travelMinutes: 40 }), { maxTravelMinutes: 20 })).toBe(false);
    expect(passesPreAIFilters(candidate({ travelMinutes: 10 }), { maxTravelMinutes: 20 })).toBe(true);
  });

  it("excludes explicitly non-wheelchair-accessible places, keeps unknowns", () => {
    expect(
      passesPreAIFilters(candidate({ wheelchairAccessible: false }), { wheelchairAccessible: true }),
    ).toBe(false);
    expect(
      passesPreAIFilters(candidate({ wheelchairAccessible: null }), { wheelchairAccessible: true }),
    ).toBe(true);
  });

  it("popular filter excludes low review counts, keeps unknowns", () => {
    expect(passesPreAIFilters(candidate({ reviewCount: 5 }), { popular: true })).toBe(false);
    expect(passesPreAIFilters(candidate({ reviewCount: 500 }), { popular: true })).toBe(true);
    expect(passesPreAIFilters(candidate({ reviewCount: null }), { popular: true })).toBe(true);
  });

  it("hiddenGems filter keeps low-review high-rating places, excludes popular ones", () => {
    expect(passesPreAIFilters(candidate({ reviewCount: 20, rating: 4.6 }), { hiddenGems: true })).toBe(true);
    expect(passesPreAIFilters(candidate({ reviewCount: 5000, rating: 4.8 }), { hiddenGems: true })).toBe(false);
  });
});

describe("passesPostAIFilters", () => {
  it("freeOnly keeps only free cost tier", () => {
    expect(passesPostAIFilters({ costTier: "free", estimatedDurationMinutes: 60 }, { freeOnly: true })).toBe(true);
    expect(passesPostAIFilters({ costTier: "low", estimatedDurationMinutes: 60 }, { freeOnly: true })).toBe(false);
  });

  it("fastVisit keeps activities under an hour", () => {
    expect(passesPostAIFilters({ costTier: "low", estimatedDurationMinutes: 45 }, { fastVisit: true })).toBe(true);
    expect(passesPostAIFilters({ costTier: "low", estimatedDurationMinutes: 90 }, { fastVisit: true })).toBe(false);
  });

  it("longActivities keeps activities of 2+ hours", () => {
    expect(
      passesPostAIFilters({ costTier: "low", estimatedDurationMinutes: 150 }, { longActivities: true }),
    ).toBe(true);
    expect(
      passesPostAIFilters({ costTier: "low", estimatedDurationMinutes: 45 }, { longActivities: true }),
    ).toBe(false);
  });
});

describe("computeCandidateScore", () => {
  it("ranks a closed place behind an open one even with a better rating", () => {
    const open = computeCandidateScore({ qualityScore: 3, isOpenNow: true, weatherUnfavorable: false, distanceKm: 1 });
    const closed = computeCandidateScore({ qualityScore: 5, isOpenNow: false, weatherUnfavorable: false, distanceKm: 1 });
    expect(open).toBeGreaterThan(closed);
  });

  it("ranks higher quality scores above lower ones, all else equal", () => {
    const better = computeCandidateScore({ qualityScore: 4.8, isOpenNow: true, weatherUnfavorable: false, distanceKm: 2 });
    const worse = computeCandidateScore({ qualityScore: 3.5, isOpenNow: true, weatherUnfavorable: false, distanceKm: 2 });
    expect(better).toBeGreaterThan(worse);
  });

  it("uses distance as a tiebreaker among equal quality", () => {
    const near = computeCandidateScore({ qualityScore: 0, isOpenNow: null, weatherUnfavorable: false, distanceKm: 0.5 });
    const far = computeCandidateScore({ qualityScore: 0, isOpenNow: null, weatherUnfavorable: false, distanceKm: 5 });
    expect(near).toBeGreaterThan(far);
  });
});
