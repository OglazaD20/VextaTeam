import { describe, expect, it } from "vitest";

import { getStatsRangeWindow, keyForInstant } from "@/lib/stats/bucket-range";

const reference = new Date("2026-07-20T12:00:00Z"); // a Monday
const TZ = "UTC";

describe("getStatsRangeWindow", () => {
  it("returns 7 day buckets ending today for 'week'", () => {
    const window = getStatsRangeWindow("week", TZ, reference);
    expect(window.bucketUnit).toBe("day");
    expect(window.bucketKeys).toHaveLength(7);
    expect(window.bucketKeys[6]).toBe("2026-07-20");
    expect(window.bucketKeys[0]).toBe("2026-07-14");
  });

  it("returns 30 day buckets ending today for 'month'", () => {
    const window = getStatsRangeWindow("month", TZ, reference);
    expect(window.bucketKeys).toHaveLength(30);
    expect(window.bucketKeys[29]).toBe("2026-07-20");
  });

  it("returns 12 month buckets ending this month for 'year'", () => {
    const window = getStatsRangeWindow("year", TZ, reference);
    expect(window.bucketUnit).toBe("month");
    expect(window.bucketKeys).toHaveLength(12);
    expect(window.bucketKeys[11]).toBe("2026-07");
    expect(window.bucketKeys[0]).toBe("2025-08");
  });

  it("produces short human labels for each bucket key", () => {
    const window = getStatsRangeWindow("week", TZ, reference);
    expect(window.labelForKey("2026-07-20")).toMatch(/Jul/);
  });
});

describe("keyForInstant", () => {
  it("formats a day key", () => {
    expect(keyForInstant(new Date("2026-07-20T23:00:00Z"), "UTC", "day")).toBe("2026-07-20");
  });

  it("formats a month key", () => {
    expect(keyForInstant(new Date("2026-07-20T23:00:00Z"), "UTC", "month")).toBe("2026-07");
  });

  it("respects timezone when bucketing near midnight", () => {
    // 2026-07-20T23:00:00Z is 2026-07-21 08:00 in Australia/Sydney (AEST, UTC+10 in July)
    expect(keyForInstant(new Date("2026-07-20T23:00:00Z"), "Australia/Sydney", "day")).toBe(
      "2026-07-21",
    );
  });
});
