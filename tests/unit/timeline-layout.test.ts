import { describe, expect, it } from "vitest";

import {
  clampMinutes,
  minutesFromMidnight,
  minutesToPx,
  pxToMinutes,
  snapMinutes,
} from "@/lib/scheduling/timeline-layout";

describe("minutesFromMidnight", () => {
  it("returns 0 at local midnight", () => {
    expect(minutesFromMidnight(new Date("2026-07-20T00:00:00Z"), "UTC")).toBe(0);
  });

  it("returns 90 at 01:30", () => {
    expect(minutesFromMidnight(new Date("2026-07-20T01:30:00Z"), "UTC")).toBe(90);
  });

  it("respects a non-UTC timezone", () => {
    // 2026-07-20T00:00:00Z is 2026-07-19 17:00 in America/Los_Angeles (PDT, UTC-7)
    expect(minutesFromMidnight(new Date("2026-07-20T00:00:00Z"), "America/Los_Angeles")).toBe(
      17 * 60,
    );
  });
});

describe("snapMinutes", () => {
  it("snaps to the nearest 15-minute increment by default", () => {
    expect(snapMinutes(7)).toBe(0);
    expect(snapMinutes(8)).toBe(15);
    expect(snapMinutes(22)).toBe(15);
    expect(snapMinutes(23)).toBe(30);
  });

  it("supports a custom step", () => {
    expect(snapMinutes(12, 10)).toBe(10);
    expect(snapMinutes(16, 10)).toBe(20);
  });
});

describe("minutesToPx / pxToMinutes", () => {
  it("round-trips with the default scale", () => {
    expect(minutesToPx(120)).toBe(120);
    expect(pxToMinutes(120)).toBe(120);
  });

  it("round-trips with a custom scale", () => {
    const px = minutesToPx(90, 2);
    expect(px).toBe(180);
    expect(pxToMinutes(px, 2)).toBe(90);
  });
});

describe("clampMinutes", () => {
  it("clamps within the default 0..1440 range", () => {
    expect(clampMinutes(-30)).toBe(0);
    expect(clampMinutes(2000)).toBe(1440);
    expect(clampMinutes(600)).toBe(600);
  });

  it("respects custom bounds", () => {
    expect(clampMinutes(5, 10, 100)).toBe(10);
    expect(clampMinutes(150, 10, 100)).toBe(100);
  });
});
