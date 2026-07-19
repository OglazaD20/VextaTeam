import { describe, expect, it } from "vitest";

import { getWakingWindowUtc } from "@/lib/scheduling/day-range";

describe("getWakingWindowUtc", () => {
  it("builds today's wake-to-sleep window in the given timezone", () => {
    const reference = new Date("2026-03-15T12:00:00Z"); // midday UTC
    const { start, end } = getWakingWindowUtc("UTC", "07:00", "23:00", reference);

    expect(start.toISOString()).toBe("2026-03-15T07:00:00.000Z");
    expect(end.toISOString()).toBe("2026-03-15T23:00:00.000Z");
  });

  it("rolls sleep time into the next day when it's numerically before wake time", () => {
    const reference = new Date("2026-03-15T12:00:00Z");
    const { start, end } = getWakingWindowUtc("UTC", "08:00", "01:00", reference);

    expect(start.toISOString()).toBe("2026-03-15T08:00:00.000Z");
    expect(end.toISOString()).toBe("2026-03-16T01:00:00.000Z");
  });

  it("respects a non-UTC timezone offset", () => {
    const reference = new Date("2026-06-15T12:00:00Z");
    // Europe/Warsaw is UTC+2 in June (DST) — 07:00 local is 05:00 UTC.
    const { start } = getWakingWindowUtc("Europe/Warsaw", "07:00", "23:00", reference);

    expect(start.toISOString()).toBe("2026-06-15T05:00:00.000Z");
  });
});
