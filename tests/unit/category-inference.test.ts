import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({ env: { PLACES_API_KEY: "test-key" } }));

const { inferActivityCategory } = await import("@/lib/activities/geoapify-client");

describe("inferActivityCategory", () => {
  it("never mislabels a bar as a park just because parks was requested", () => {
    // Regression: a place tagged "catering.bar" was previously forced into
    // requested[0] ("parks") whenever "bars" wasn't in the requested set.
    const result = inferActivityCategory(["catering.bar"], ["parks", "restaurants"]);
    expect(result).toEqual({ category: "bars", confidence: "high" });
  });

  it("never mislabels a museum as a restaurant", () => {
    const result = inferActivityCategory(["entertainment.museum"], ["restaurants"]);
    expect(result).toEqual({ category: "museums", confidence: "high" });
  });

  it("never mislabels a gym as shopping", () => {
    const result = inferActivityCategory(["sport.fitness"], ["shopping"]);
    expect(result).toEqual({ category: "gyms", confidence: "high" });
  });

  it("prefers a requested bucket over a full-taxonomy match when both match", () => {
    const result = inferActivityCategory(["catering.cafe"], ["relax", "coffee"]);
    expect(result).toEqual({ category: "relax", confidence: "high" });
  });

  it("flags low confidence only when no real tag matches anything in the taxonomy", () => {
    const result = inferActivityCategory(["unknown.tag"], ["restaurants"]);
    expect(result).toEqual({ category: "restaurants", confidence: "low" });
  });

  it("flags low confidence when there are no raw tags at all", () => {
    const result = inferActivityCategory([], ["parks"]);
    expect(result).toEqual({ category: "parks", confidence: "low" });
  });
});
