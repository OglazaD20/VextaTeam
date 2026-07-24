import { describe, expect, it } from "vitest";

import { getTimeOfDay } from "@/lib/dashboard/time-of-day";

describe("getTimeOfDay", () => {
  it("is morning from 5am to 11:59am", () => {
    expect(getTimeOfDay("UTC", new Date("2026-07-24T05:00:00Z"))).toBe("morning");
    expect(getTimeOfDay("UTC", new Date("2026-07-24T11:59:00Z"))).toBe("morning");
  });

  it("is afternoon from noon to 5:59pm", () => {
    expect(getTimeOfDay("UTC", new Date("2026-07-24T12:00:00Z"))).toBe("afternoon");
    expect(getTimeOfDay("UTC", new Date("2026-07-24T17:59:00Z"))).toBe("afternoon");
  });

  it("is evening from 6pm through the night", () => {
    expect(getTimeOfDay("UTC", new Date("2026-07-24T18:00:00Z"))).toBe("evening");
    expect(getTimeOfDay("UTC", new Date("2026-07-24T23:59:00Z"))).toBe("evening");
    expect(getTimeOfDay("UTC", new Date("2026-07-24T00:00:00Z"))).toBe("evening");
    expect(getTimeOfDay("UTC", new Date("2026-07-24T04:59:00Z"))).toBe("evening");
  });

  it("respects the user's timezone, not the server's", () => {
    // 2026-07-24T02:00:00Z is 22:00 the previous day in America/Los_Angeles (UTC-7 in July).
    expect(getTimeOfDay("America/Los_Angeles", new Date("2026-07-24T05:00:00Z"))).toBe("evening");
  });
});
