import { describe, expect, it } from "vitest";

import { generateOccurrences } from "@/lib/recurrence/rules";

function d(month: number, day: number, hour = 7, minute = 0) {
  return new Date(2026, month - 1, day, hour, minute, 0, 0);
}

describe("generateOccurrences", () => {
  it("generates daily occurrences at the anchor time", () => {
    const result = generateOccurrences(d(3, 1), { freq: "daily", interval: 1 }, d(3, 4));
    expect(result).toEqual([d(3, 1), d(3, 2), d(3, 3), d(3, 4)]);
  });

  it("respects an interval greater than 1", () => {
    const result = generateOccurrences(d(3, 1), { freq: "daily", interval: 2 }, d(3, 7));
    expect(result).toEqual([d(3, 1), d(3, 3), d(3, 5), d(3, 7)]);
  });

  it("stops at the until date", () => {
    const result = generateOccurrences(
      d(3, 1),
      { freq: "daily", interval: 1, until: d(3, 2).toISOString() },
      d(3, 10),
    );
    expect(result).toEqual([d(3, 1), d(3, 2)]);
  });

  it("stops after count occurrences", () => {
    const result = generateOccurrences(
      d(3, 1),
      { freq: "daily", interval: 1, count: 3 },
      d(3, 30),
    );
    expect(result).toHaveLength(3);
  });

  it("handles weekly byWeekday (Mon/Wed/Fri)", () => {
    // 2026-03-01 is a Sunday; Mon=3/2, Wed=3/4, Fri=3/6
    const result = generateOccurrences(
      d(3, 2), // Monday
      { freq: "weekly", interval: 1, byWeekday: [1, 3, 5] },
      d(3, 8), // through the following Sunday
    );
    expect(result.map((r) => r.getDate())).toEqual([2, 4, 6]);
  });

  it("respects a weekly interval > 1 with byWeekday (every other week)", () => {
    const result = generateOccurrences(
      d(3, 2), // Monday, week 0
      { freq: "weekly", interval: 2, byWeekday: [1] },
      d(3, 23),
    );
    // Week 0 Mon (3/2), Week 2 Mon (3/16) — Week 1's Monday (3/9) is skipped
    expect(result.map((r) => r.getDate())).toEqual([2, 16]);
  });

  it("preserves the anchor's time-of-day on every occurrence", () => {
    const result = generateOccurrences(
      d(3, 2, 6, 30),
      { freq: "weekly", interval: 1, byWeekday: [1, 3] },
      d(3, 8),
    );
    for (const occurrence of result) {
      expect(occurrence.getHours()).toBe(6);
      expect(occurrence.getMinutes()).toBe(30);
    }
  });

  it("matches byWeekday against the owning user's local calendar day, not the server's UTC day", () => {
    // 2026-01-06T07:00:00Z is Monday Jan 5, 23:00 in America/Los_Angeles
    // (UTC-8) — a plain UTC .getDay() would read this as Tuesday and skip
    // the user's actual Monday entirely.
    const anchor = new Date("2026-01-06T07:00:00.000Z");
    const throughDate = new Date("2026-01-13T07:00:00.000Z");

    const result = generateOccurrences(
      anchor,
      { freq: "weekly", interval: 1, byWeekday: [1] },
      throughDate,
      "America/Los_Angeles",
    );

    expect(result.map((r) => r.toISOString())).toEqual([
      "2026-01-06T07:00:00.000Z",
      "2026-01-13T07:00:00.000Z",
    ]);
  });
});
