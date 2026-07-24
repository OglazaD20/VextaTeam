import { describe, expect, it } from "vitest";

import { computeLevel, computeLevelProgress, xpRequiredForLevel } from "@/lib/gamification/leveling";

describe("xpRequiredForLevel", () => {
  it("requires 0 XP for level 1", () => {
    expect(xpRequiredForLevel(1)).toBe(0);
  });

  it("requires increasing XP for each subsequent level", () => {
    const l2 = xpRequiredForLevel(2);
    const l3 = xpRequiredForLevel(3);
    const l4 = xpRequiredForLevel(4);
    expect(l2).toBeGreaterThan(0);
    expect(l3 - l2).toBeGreaterThan(l2);
    expect(l4 - l3).toBeGreaterThan(l3 - l2);
  });
});

describe("computeLevel", () => {
  it("returns level 1 for 0 XP", () => {
    expect(computeLevel(0)).toBe(1);
  });

  it("returns the correct level at an exact threshold", () => {
    const xpForLevel5 = xpRequiredForLevel(5);
    expect(computeLevel(xpForLevel5)).toBe(5);
  });

  it("does not advance a level early", () => {
    const xpForLevel5 = xpRequiredForLevel(5);
    expect(computeLevel(xpForLevel5 - 1)).toBe(4);
  });
});

describe("computeLevelProgress", () => {
  it("reports 0% right at a level threshold", () => {
    const progress = computeLevelProgress(xpRequiredForLevel(3));
    expect(progress.level).toBe(3);
    expect(progress.xpIntoLevel).toBe(0);
    expect(progress.pctToNextLevel).toBe(0);
  });

  it("reports partial progress mid-level", () => {
    const floor = xpRequiredForLevel(2);
    const ceiling = xpRequiredForLevel(3);
    const midpoint = Math.round((floor + ceiling) / 2);
    const progress = computeLevelProgress(midpoint);
    expect(progress.level).toBe(2);
    expect(progress.pctToNextLevel).toBeGreaterThan(0);
    expect(progress.pctToNextLevel).toBeLessThan(100);
  });
});
