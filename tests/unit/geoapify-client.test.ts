import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({ env: { PLACES_API_KEY: "test-key" } }));

const { buildOverviewStaticMapUrl, buildStaticMapUrl } = await import("@/lib/activities/geoapify-client");

describe("buildStaticMapUrl", () => {
  it("never double-encodes the marker color", () => {
    // A pre-encoded "%23" in the source string becomes "%2523" once
    // URLSearchParams encodes it — Geoapify's marker parser rejects that
    // with a 400. The color must be a literal "#" so it's encoded exactly once.
    const url = buildStaticMapUrl({ lat: 52.2297, lng: 21.0122 });
    expect(url).not.toContain("%2523");
    expect(url).toContain("%23");
  });

  it("uses a single marker param", () => {
    const url = buildStaticMapUrl({ lat: 52.2297, lng: 21.0122 });
    expect(url.match(/marker=/g)).toHaveLength(1);
  });
});

describe("buildOverviewStaticMapUrl", () => {
  const center = { lat: 52.2297, lng: 21.0122 };
  const points = [
    { location: { lat: 52.23, lng: 21.01 } },
    { location: { lat: 52.24, lng: 21.02 } },
    { location: { lat: 52.25, lng: 21.03 } },
  ];

  it("never double-encodes marker colors", () => {
    const url = buildOverviewStaticMapUrl(center, points);
    expect(url).not.toContain("%2523");
  });

  it("packs every pin into a single pipe-separated marker param, not repeated params", () => {
    // Geoapify parses repeated &marker=&marker= as an array and rejects it
    // ("marker[0][1]" does not match any of the allowed types) — every pin
    // must be one "|"-joined value under a single marker= param.
    const url = buildOverviewStaticMapUrl(center, points);
    expect(url.match(/marker=/g)).toHaveLength(1);
    const markerValue = new URL(url).searchParams.get("marker") ?? "";
    expect(markerValue.split("|")).toHaveLength(points.length + 1); // +1 for the origin marker
  });

  it("caps markers at 40 plus the origin", () => {
    const manyPoints = Array.from({ length: 60 }, (_, i) => ({
      location: { lat: 52.2 + i * 0.001, lng: 21.0 + i * 0.001 },
    }));
    const url = buildOverviewStaticMapUrl(center, manyPoints);
    const markerValue = new URL(url).searchParams.get("marker") ?? "";
    expect(markerValue.split("|")).toHaveLength(41);
  });
});
