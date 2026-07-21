import { describe, expect, it } from "vitest";

import { estimateTravelMinutes, haversineDistanceKm } from "@/lib/activities/distance";

describe("haversineDistanceKm", () => {
  it("returns 0 for identical points", () => {
    expect(haversineDistanceKm({ lat: 52.23, lng: 21.01 }, { lat: 52.23, lng: 21.01 })).toBe(0);
  });

  it("computes a known distance (Warsaw to Krakow, ~250-260km)", () => {
    const warsaw = { lat: 52.2297, lng: 21.0122 };
    const krakow = { lat: 50.0647, lng: 19.945 };
    const distance = haversineDistanceKm(warsaw, krakow);
    expect(distance).toBeGreaterThan(240);
    expect(distance).toBeLessThan(270);
  });

  it("is symmetric", () => {
    const a = { lat: 40.7128, lng: -74.006 };
    const b = { lat: 34.0522, lng: -118.2437 };
    expect(haversineDistanceKm(a, b)).toBe(haversineDistanceKm(b, a));
  });
});

describe("estimateTravelMinutes", () => {
  it("estimates walking time slower than driving for the same distance", () => {
    const walk = estimateTravelMinutes(5, "walk");
    const drive = estimateTravelMinutes(5, "drive");
    expect(walk).toBeGreaterThan(drive);
  });

  it("never returns less than 1 minute", () => {
    expect(estimateTravelMinutes(0.01, "drive")).toBeGreaterThanOrEqual(1);
  });
});
