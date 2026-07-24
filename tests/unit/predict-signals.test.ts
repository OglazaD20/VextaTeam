import { describe, expect, it } from "vitest";

import {
  computeBudgetForecast,
  computeGoalForecast,
  computeHabitMissRisk,
  computeWeightProjection,
} from "@/lib/predict/signals";

describe("computeGoalForecast", () => {
  it("flags a goal as on track when pace matches or beats elapsed time", () => {
    const createdAt = new Date(Date.now() - 20 * 86_400_000);
    const deadline = new Date(Date.now() + 20 * 86_400_000); // 40-day goal, day 20
    const result = computeGoalForecast({ id: "g1", title: "Read 12 books", createdAt, deadline, progressPct: 55 });
    expect(result).not.toBeNull();
    expect(result!.onTrack).toBe(true);
    expect(result!.paceRatio).toBeGreaterThanOrEqual(1);
  });

  it("flags a goal as behind pace when progress lags time elapsed", () => {
    const createdAt = new Date(Date.now() - 30 * 86_400_000);
    const deadline = new Date(Date.now() + 10 * 86_400_000); // 40-day goal, day 30
    const result = computeGoalForecast({ id: "g1", title: "Read 12 books", createdAt, deadline, progressPct: 20 });
    expect(result).not.toBeNull();
    expect(result!.onTrack).toBe(false);
  });

  it("returns null once the deadline has passed", () => {
    const createdAt = new Date(Date.now() - 40 * 86_400_000);
    const deadline = new Date(Date.now() - 5 * 86_400_000);
    expect(computeGoalForecast({ id: "g1", title: "x", createdAt, deadline, progressPct: 50 })).toBeNull();
  });
});

describe("computeWeightProjection", () => {
  it("extrapolates a clear downward trend", () => {
    const metrics = [
      { dateKey: "2026-06-01", weightKg: 82 },
      { dateKey: "2026-06-08", weightKg: 81.3 },
      { dateKey: "2026-06-15", weightKg: 80.6 },
      { dateKey: "2026-06-22", weightKg: 80 },
    ];
    const result = computeWeightProjection(metrics, 8);
    expect(result).not.toBeNull();
    expect(result!.ratePerWeekKg).toBeLessThan(0);
    expect(result!.projectedChangeKg).toBeLessThan(0);
  });

  it("returns null for a flat trend", () => {
    const metrics = [
      { dateKey: "2026-06-01", weightKg: 80 },
      { dateKey: "2026-06-08", weightKg: 80.02 },
      { dateKey: "2026-06-15", weightKg: 79.98 },
      { dateKey: "2026-06-22", weightKg: 80.01 },
    ];
    expect(computeWeightProjection(metrics)).toBeNull();
  });

  it("returns null with too few data points", () => {
    expect(computeWeightProjection([{ dateKey: "2026-06-01", weightKg: 80 }])).toBeNull();
  });
});

describe("computeHabitMissRisk", () => {
  it("flags a habit clearly behind its weekly target", () => {
    const result = computeHabitMissRisk({
      id: "h1",
      name: "Reading",
      completionsThisPeriod: 1,
      targetPerPeriod: 5,
      daysElapsedInPeriod: 5,
      daysTotalInPeriod: 7,
    });
    expect(result).not.toBeNull();
    expect(result!.habitName).toBe("Reading");
  });

  it("returns null when comfortably on pace", () => {
    const result = computeHabitMissRisk({
      id: "h1",
      name: "Reading",
      completionsThisPeriod: 4,
      targetPerPeriod: 5,
      daysElapsedInPeriod: 5,
      daysTotalInPeriod: 7,
    });
    expect(result).toBeNull();
  });

  it("returns null too early in the period to judge", () => {
    const result = computeHabitMissRisk({
      id: "h1",
      name: "Reading",
      completionsThisPeriod: 0,
      targetPerPeriod: 5,
      daysElapsedInPeriod: 1,
      daysTotalInPeriod: 7,
    });
    expect(result).toBeNull();
  });
});

describe("computeBudgetForecast", () => {
  it("projects an over-budget category", () => {
    const result = computeBudgetForecast("food", 400, 300, 15, 30);
    expect(result).not.toBeNull();
    expect(result!.projected).toBeGreaterThan(400);
    expect(result!.overBy).toBeGreaterThan(0);
  });

  it("returns null when projected spend stays under budget", () => {
    expect(computeBudgetForecast("food", 800, 100, 15, 30)).toBeNull();
  });

  it("returns null too early in the month", () => {
    expect(computeBudgetForecast("food", 400, 100, 1, 30)).toBeNull();
  });
});
