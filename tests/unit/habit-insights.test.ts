import { describe, expect, it } from "vitest";

import { computeHabitSignals, type HabitInsightInput } from "@/lib/habits/insights";

const TZ = "UTC";
const reference = new Date("2026-07-20T09:00:00Z");

function habit(overrides: Partial<HabitInsightInput> = {}): HabitInsightInput {
  return {
    id: "h1",
    name: "Drink water",
    cadence: "daily",
    createdAt: "2026-06-01T00:00:00Z",
    ...overrides,
  };
}

function daysAgo(n: number) {
  const d = new Date(reference);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

describe("computeHabitSignals", () => {
  it("flags a habit that has never been logged after a couple of days", () => {
    const signals = computeHabitSignals(
      [habit({ createdAt: daysAgo(5) + "T00:00:00Z" })],
      new Map(),
      TZ,
      reference,
    );
    expect(signals).toHaveLength(1);
    expect(signals[0].reason).toBe("never_logged");
  });

  it("does not flag a brand-new habit created today", () => {
    const signals = computeHabitSignals(
      [habit({ createdAt: reference.toISOString() })],
      new Map(),
      TZ,
      reference,
    );
    expect(signals).toHaveLength(0);
  });

  it("flags a broken streak when a prior streak stopped a few days ago", () => {
    const logs = new Set([daysAgo(10), daysAgo(9), daysAgo(8), daysAgo(7), daysAgo(6)]);
    const signals = computeHabitSignals(
      [habit({ createdAt: daysAgo(20) + "T00:00:00Z" })],
      new Map([["h1", logs]]),
      TZ,
      reference,
    );
    expect(signals).toHaveLength(1);
    expect(signals[0].reason).toBe("streak_broken");
    expect(signals[0].currentStreak).toBe(0);
  });

  it("flags low completion rate over the lookback window", () => {
    const logs = new Set([daysAgo(29), daysAgo(20)]);
    const signals = computeHabitSignals(
      [habit({ createdAt: daysAgo(40) + "T00:00:00Z" })],
      new Map([["h1", logs]]),
      TZ,
      reference,
    );
    expect(signals).toHaveLength(1);
    expect(signals[0].reason).toBe("low_completion");
    expect(signals[0].completionRate).toBeLessThan(0.5);
  });

  it("does not flag a habit with a healthy ongoing streak", () => {
    const logs = new Set([daysAgo(0), daysAgo(1), daysAgo(2), daysAgo(3), daysAgo(4)]);
    const signals = computeHabitSignals(
      [habit({ createdAt: daysAgo(10) + "T00:00:00Z" })],
      new Map([["h1", logs]]),
      TZ,
      reference,
    );
    expect(signals).toHaveLength(0);
  });
});
