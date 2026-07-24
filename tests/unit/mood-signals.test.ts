import { describe, expect, it } from "vitest";

import {
  computeMoodByWeekday,
  computeMoodSleepCorrelation,
  computeMoodTrend,
  type MoodRecord,
} from "@/lib/mood/signals";

function makeLog(daysAgo: number, mood: number): MoodRecord {
  const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return { loggedAt: date.toISOString(), mood, stress: null, energy: null };
}

describe("computeMoodTrend", () => {
  it("returns null with too few logs", () => {
    expect(computeMoodTrend([makeLog(1, 3), makeLog(2, 3)])).toBeNull();
  });

  it("detects an improving trend", () => {
    const logs = [
      makeLog(10, 2),
      makeLog(9, 2),
      makeLog(8, 2),
      makeLog(3, 5),
      makeLog(2, 5),
      makeLog(1, 5),
    ];
    const result = computeMoodTrend(logs);
    expect(result?.direction).toBe("improving");
  });

  it("detects a declining trend", () => {
    const logs = [
      makeLog(10, 5),
      makeLog(9, 5),
      makeLog(8, 5),
      makeLog(3, 2),
      makeLog(2, 2),
      makeLog(1, 2),
    ];
    const result = computeMoodTrend(logs);
    expect(result?.direction).toBe("declining");
  });

  it("reports stable when there's no meaningful change", () => {
    const logs = [makeLog(6, 3), makeLog(5, 3), makeLog(4, 3), makeLog(3, 3), makeLog(2, 3), makeLog(1, 3)];
    expect(computeMoodTrend(logs)?.direction).toBe("stable");
  });
});

describe("computeMoodByWeekday", () => {
  it("returns null without enough distinct weekdays", () => {
    const logs = [makeLog(0, 3), makeLog(0, 4)];
    expect(computeMoodByWeekday(logs, "UTC")).toBeNull();
  });
});

describe("computeMoodSleepCorrelation", () => {
  it("returns null with too few samples per bucket", () => {
    const result = computeMoodSleepCorrelation(
      [{ dateKey: "2026-01-01", mood: 4 }],
      new Map([["2026-01-01", 8]]),
    );
    expect(result).toBeNull();
  });

  it("computes average mood for better vs worse sleep nights", () => {
    const moodLogs = [
      { dateKey: "2026-01-01", mood: 5 },
      { dateKey: "2026-01-02", mood: 4 },
      { dateKey: "2026-01-03", mood: 5 },
      { dateKey: "2026-01-04", mood: 2 },
      { dateKey: "2026-01-05", mood: 2 },
      { dateKey: "2026-01-06", mood: 3 },
    ];
    const sleepByDate = new Map([
      ["2026-01-01", 8],
      ["2026-01-02", 7.5],
      ["2026-01-03", 8],
      ["2026-01-04", 5],
      ["2026-01-05", 4.5],
      ["2026-01-06", 5],
    ]);
    const result = computeMoodSleepCorrelation(moodLogs, sleepByDate);
    expect(result).not.toBeNull();
    expect(result!.betterSleepAvgMood).toBeGreaterThan(result!.worseSleepAvgMood);
  });
});
