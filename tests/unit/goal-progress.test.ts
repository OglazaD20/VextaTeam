import { describe, expect, it } from "vitest";

import { computeGoalProgressPct, predictCompletionDate } from "@/lib/goals/progress";

describe("computeGoalProgressPct", () => {
  it("prioritizes milestone completion ratio when milestones exist", () => {
    const pct = computeGoalProgressPct({
      targetValue: 100,
      currentValue: 10,
      manualProgressPct: 50,
      milestones: [{ isCompleted: true }, { isCompleted: true }, { isCompleted: false }, { isCompleted: false }],
    });
    expect(pct).toBe(50);
  });

  it("falls back to target/current ratio when there are no milestones", () => {
    const pct = computeGoalProgressPct({
      targetValue: 12,
      currentValue: 3,
      manualProgressPct: null,
      milestones: [],
    });
    expect(pct).toBe(25);
  });

  it("clamps target/current ratio to 100", () => {
    const pct = computeGoalProgressPct({
      targetValue: 10,
      currentValue: 50,
      manualProgressPct: null,
      milestones: [],
    });
    expect(pct).toBe(100);
  });

  it("falls back to manual percentage when no milestones or target exist", () => {
    const pct = computeGoalProgressPct({
      targetValue: null,
      currentValue: 0,
      manualProgressPct: 40,
      milestones: [],
    });
    expect(pct).toBe(40);
  });

  it("defaults to 0 when nothing is set", () => {
    const pct = computeGoalProgressPct({
      targetValue: null,
      currentValue: 0,
      manualProgressPct: null,
      milestones: [],
    });
    expect(pct).toBe(0);
  });
});

describe("predictCompletionDate", () => {
  it("returns null when there's no deadline", () => {
    expect(predictCompletionDate(new Date("2026-01-01"), null, 50)).toBeNull();
  });

  it("returns null when progress is zero", () => {
    expect(predictCompletionDate(new Date("2026-01-01"), new Date("2026-06-01"), 0)).toBeNull();
  });

  it("extrapolates linearly from elapsed time and progress", () => {
    const created = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
    const deadline = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    // 50% done after 10 days -> projected total = 20 days -> completes ~10 days from now
    const predicted = predictCompletionDate(created, deadline, 50);
    expect(predicted).not.toBeNull();
    const daysFromNow = (predicted!.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(daysFromNow).toBeCloseTo(10, 0);
  });
});
