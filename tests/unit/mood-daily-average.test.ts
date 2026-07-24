import { describe, expect, it } from "vitest";

import { computeDailyMoodAverages } from "@/lib/mood/daily-average";

describe("computeDailyMoodAverages", () => {
  it("averages multiple same-day check-ins into one point", () => {
    const points = computeDailyMoodAverages([
      { loggedForDate: "2026-01-01", mood: 4, energy: 3, stress: 2 },
      { loggedForDate: "2026-01-01", mood: 2, energy: 5, stress: null },
    ]);
    expect(points).toEqual([
      { dateKey: "2026-01-01", avgMood: 3, avgEnergy: 4, avgStress: 2 },
    ]);
  });

  it("returns one point per distinct date, sorted ascending", () => {
    const points = computeDailyMoodAverages([
      { loggedForDate: "2026-01-03", mood: 5, energy: null, stress: null },
      { loggedForDate: "2026-01-01", mood: 3, energy: null, stress: null },
    ]);
    expect(points.map((p) => p.dateKey)).toEqual(["2026-01-01", "2026-01-03"]);
  });

  it("returns an empty array for no logs", () => {
    expect(computeDailyMoodAverages([])).toEqual([]);
  });
});
