import { describe, expect, it } from "vitest";

import {
  computeBurnoutSignal,
  computeHydrationTimingSignal,
  computeLongestHabitStreak,
  computeSleepProductivitySignal,
  computeTaskCompletionSignal,
  computeWeakestExerciseWeekday,
  computeWeightTrend,
} from "@/lib/coach/signals";

const TZ = "UTC";

describe("computeTaskCompletionSignal", () => {
  it("computes overall completion rate", () => {
    const tasks = [
      { status: "completed", priority: 3, scheduledStart: null },
      { status: "completed", priority: 3, scheduledStart: null },
      { status: "planned", priority: 3, scheduledStart: null },
      { status: "planned", priority: 3, scheduledStart: null },
    ];
    expect(computeTaskCompletionSignal(tasks, TZ).completionRate).toBe(0.5);
  });

  it("computes morning completion rate for high-priority tasks with enough data", () => {
    const tasks = [
      { status: "completed", priority: 1, scheduledStart: "2026-07-20T09:00:00Z" },
      { status: "completed", priority: 2, scheduledStart: "2026-07-20T10:00:00Z" },
      { status: "completed", priority: 1, scheduledStart: "2026-07-20T15:00:00Z" },
    ];
    const signal = computeTaskCompletionSignal(tasks, TZ);
    expect(signal.morningHighPriorityCompletionRate).toBeCloseTo(2 / 3, 2);
  });

  it("returns null for morning rate with too little high-priority data", () => {
    const tasks = [{ status: "completed", priority: 1, scheduledStart: "2026-07-20T09:00:00Z" }];
    expect(computeTaskCompletionSignal(tasks, TZ).morningHighPriorityCompletionRate).toBeNull();
  });
});

describe("computeSleepProductivitySignal", () => {
  it("returns null with insufficient data in either bucket", () => {
    const health = [{ dateKey: "2026-07-01", sleepHours: 8, exerciseMinutes: null }];
    const focus = [{ dateKey: "2026-07-01", actualMinutes: 50, plannedMinutes: 50, moodAfter: null }];
    expect(computeSleepProductivitySignal(health, focus)).toBeNull();
  });

  it("computes a percent difference when both buckets have enough data", () => {
    const health = [
      { dateKey: "2026-07-01", sleepHours: 8, exerciseMinutes: null },
      { dateKey: "2026-07-02", sleepHours: 8, exerciseMinutes: null },
      { dateKey: "2026-07-03", sleepHours: 8, exerciseMinutes: null },
      { dateKey: "2026-07-04", sleepHours: 5, exerciseMinutes: null },
      { dateKey: "2026-07-05", sleepHours: 5, exerciseMinutes: null },
      { dateKey: "2026-07-06", sleepHours: 5, exerciseMinutes: null },
    ];
    const focus = [
      { dateKey: "2026-07-01", actualMinutes: 50, plannedMinutes: 50, moodAfter: null },
      { dateKey: "2026-07-02", actualMinutes: 45, plannedMinutes: 50, moodAfter: null },
      { dateKey: "2026-07-03", actualMinutes: 55, plannedMinutes: 50, moodAfter: null },
      { dateKey: "2026-07-04", actualMinutes: 25, plannedMinutes: 50, moodAfter: null },
      { dateKey: "2026-07-05", actualMinutes: 30, plannedMinutes: 50, moodAfter: null },
      { dateKey: "2026-07-06", actualMinutes: 20, plannedMinutes: 50, moodAfter: null },
    ];
    const signal = computeSleepProductivitySignal(health, focus);
    expect(signal).not.toBeNull();
    expect(signal!.percentDifference).toBeGreaterThan(0);
  });
});

describe("computeWeakestExerciseWeekday", () => {
  it("returns null without enough weekday coverage", () => {
    const health = [{ dateKey: "2026-07-20", sleepHours: null, exerciseMinutes: 30 }];
    expect(computeWeakestExerciseWeekday(health, TZ)).toBeNull();
  });
});

describe("computeHydrationTimingSignal", () => {
  it("returns null with too few logs", () => {
    expect(computeHydrationTimingSignal([{ loggedAt: "2026-07-20T09:00:00Z" }], TZ)).toBeNull();
  });

  it("splits logs before/after the cutoff hour", () => {
    const logs = [
      { loggedAt: "2026-07-20T08:00:00Z" },
      { loggedAt: "2026-07-20T09:00:00Z" },
      { loggedAt: "2026-07-20T10:00:00Z" },
      { loggedAt: "2026-07-20T16:00:00Z" },
      { loggedAt: "2026-07-20T18:00:00Z" },
    ];
    const signal = computeHydrationTimingSignal(logs, TZ);
    expect(signal).not.toBeNull();
    expect(signal!.beforeAvgMl + signal!.afterAvgMl).toBe(100);
  });
});

describe("computeWeightTrend", () => {
  it("returns null with too few data points", () => {
    expect(computeWeightTrend([{ dateKey: "2026-07-01", weightKg: 70 }])).toBeNull();
  });

  it("flags a downward trend", () => {
    const metrics = [
      { dateKey: "2026-07-01", weightKg: 72 },
      { dateKey: "2026-07-08", weightKg: 71.5 },
      { dateKey: "2026-07-15", weightKg: 71 },
      { dateKey: "2026-07-22", weightKg: 70.5 },
    ];
    const trend = computeWeightTrend(metrics);
    expect(trend?.direction).toBe("down");
    expect(trend?.changeKg).toBeCloseTo(1.5, 1);
  });

  it("flags stable when change is negligible", () => {
    const metrics = [
      { dateKey: "2026-07-01", weightKg: 70 },
      { dateKey: "2026-07-08", weightKg: 70.1 },
      { dateKey: "2026-07-15", weightKg: 70 },
      { dateKey: "2026-07-22", weightKg: 70.2 },
    ];
    expect(computeWeightTrend(metrics)?.direction).toBe("stable");
  });
});

describe("computeLongestHabitStreak", () => {
  it("returns the longest streak above the minimum threshold", () => {
    const streaks = [
      { name: "Reading", streak: 22 },
      { name: "Water", streak: 3 },
    ];
    expect(computeLongestHabitStreak(streaks)).toEqual({ habitName: "Reading", streak: 22 });
  });

  it("returns null when nothing meets the threshold", () => {
    expect(computeLongestHabitStreak([{ name: "Water", streak: 2 }])).toBeNull();
  });
});

describe("computeBurnoutSignal", () => {
  it("returns null when neither completion nor sleep dropped", () => {
    const tasks = { recent: [{ status: "completed", priority: 3, scheduledStart: null }], prior: [{ status: "completed", priority: 3, scheduledStart: null }] };
    const health = { recent: [], prior: [] };
    expect(computeBurnoutSignal(tasks, health)).toBeNull();
  });

  it("flags a burnout risk when completion rate drops sharply", () => {
    const tasks = {
      recent: [
        { status: "planned", priority: 3, scheduledStart: null },
        { status: "planned", priority: 3, scheduledStart: null },
        { status: "completed", priority: 3, scheduledStart: null },
      ],
      prior: [
        { status: "completed", priority: 3, scheduledStart: null },
        { status: "completed", priority: 3, scheduledStart: null },
        { status: "completed", priority: 3, scheduledStart: null },
      ],
    };
    const health = { recent: [], prior: [] };
    const signal = computeBurnoutSignal(tasks, health);
    expect(signal).not.toBeNull();
    expect(signal!.recentCompletionRate).toBeLessThan(signal!.priorCompletionRate);
  });
});
