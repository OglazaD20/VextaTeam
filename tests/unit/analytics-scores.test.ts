import { describe, expect, it } from "vitest";

import {
  computeBalanceScore,
  computeConsistencyScore,
  computeHealthScore,
  computeLifeScore,
  computeLifestyleScore,
  computeProductivityScore,
} from "@/lib/analytics/scores";

describe("computeProductivityScore", () => {
  it("averages task completion, goal progress, and focus ratio", () => {
    const score = computeProductivityScore({
      completedTasks: 8,
      totalTasks: 10, // 80%
      goalProgressPcts: [60, 80], // avg 70
      focusRatios: [1, 0.5], // avg 75%
    });
    expect(score).toBeCloseTo((80 + 70 + 75) / 3, 0);
  });

  it("returns null when there's no data at all", () => {
    expect(computeProductivityScore({ completedTasks: 0, totalTasks: 0, goalProgressPcts: [], focusRatios: [] })).toBeNull();
  });

  it("uses only the available signals when some are missing", () => {
    const score = computeProductivityScore({
      completedTasks: 5,
      totalTasks: 10,
      goalProgressPcts: [],
      focusRatios: [],
    });
    expect(score).toBe(50);
  });
});

describe("computeHealthScore", () => {
  it("scores 100 for sleep within the 7-9h band and full exercise/hydration/nutrition consistency", () => {
    const score = computeHealthScore({
      avgSleepHours: 8,
      daysWithExercise: 7,
      daysWithHydration: 7,
      daysWithinCalorieGoal: 7,
      totalDays: 7,
    });
    expect(score).toBe(100);
  });

  it("penalizes sleep outside the 7-9h band", () => {
    const score = computeHealthScore({
      avgSleepHours: 5, // 2h under -> -40
      daysWithExercise: 7,
      daysWithHydration: 7,
      daysWithinCalorieGoal: 7,
      totalDays: 7,
    });
    expect(score).toBeCloseTo((60 + 100 + 100 + 100) / 4, 0);
  });

  it("returns null for a zero-day window", () => {
    expect(
      computeHealthScore({ avgSleepHours: null, daysWithExercise: 0, daysWithHydration: 0, daysWithinCalorieGoal: 0, totalDays: 0 }),
    ).toBeNull();
  });
});

describe("computeLifestyleScore", () => {
  it("scales mood 1-5 to 0-100 and caps discover count at the saturation threshold", () => {
    const score = computeLifestyleScore({ avgMood: 5, discoverActivitiesCount: 10, habitCompletionPct: 100 });
    expect(score).toBe(100);
  });

  it("scores a mood of 3 (midpoint) as 50", () => {
    const score = computeLifestyleScore({ avgMood: 3, discoverActivitiesCount: 0, habitCompletionPct: null });
    expect(score).toBe(25); // avg of moodScore=50 and discoverScore=0
  });
});

describe("computeConsistencyScore", () => {
  it("computes the fraction of days with any logged activity", () => {
    expect(computeConsistencyScore({ daysWithAnyActivity: 5, totalDays: 7 })).toBeCloseTo(71.4, 1);
  });

  it("returns null for a zero-day window", () => {
    expect(computeConsistencyScore({ daysWithAnyActivity: 0, totalDays: 0 })).toBeNull();
  });
});

describe("computeBalanceScore", () => {
  it("scores 100 for perfectly even distribution across categories", () => {
    expect(computeBalanceScore({ work: 10, health: 10, social: 10 })).toBe(100);
  });

  it("scores low for all-in-one-category concentration", () => {
    const score = computeBalanceScore({ work: 100, health: 1 });
    expect(score).toBeLessThan(30);
  });

  it("returns null with fewer than 2 categories", () => {
    expect(computeBalanceScore({ work: 10 })).toBeNull();
    expect(computeBalanceScore({})).toBeNull();
  });
});

describe("computeLifeScore", () => {
  it("averages the available sub-scores", () => {
    const score = computeLifeScore({ productivity: 80, health: 60, lifestyle: 70, consistency: 100, balance: null });
    expect(score).toBeCloseTo((80 + 60 + 70 + 100) / 4, 0);
  });

  it("returns null when nothing is available", () => {
    expect(computeLifeScore({ productivity: null, health: null, lifestyle: null, consistency: null, balance: null })).toBeNull();
  });
});
