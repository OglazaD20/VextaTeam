import { describe, expect, it } from "vitest";

import { computeFreeGaps, mergeIntervals } from "@/lib/scheduling/gaps";

function d(hour: number, minute = 0) {
  return new Date(2026, 0, 1, hour, minute, 0, 0);
}

describe("mergeIntervals", () => {
  it("merges overlapping intervals", () => {
    const result = mergeIntervals([
      { start: d(9), end: d(10) },
      { start: d(9, 30), end: d(11) },
    ]);
    expect(result).toEqual([{ start: d(9), end: d(11) }]);
  });

  it("merges adjacent (touching) intervals", () => {
    const result = mergeIntervals([
      { start: d(9), end: d(10) },
      { start: d(10), end: d(11) },
    ]);
    expect(result).toEqual([{ start: d(9), end: d(11) }]);
  });

  it("leaves non-overlapping intervals separate and sorts them", () => {
    const result = mergeIntervals([
      { start: d(14), end: d(15) },
      { start: d(9), end: d(10) },
    ]);
    expect(result).toEqual([
      { start: d(9), end: d(10) },
      { start: d(14), end: d(15) },
    ]);
  });
});

describe("computeFreeGaps", () => {
  const window = { start: d(8), end: d(18) };

  it("returns the whole window when there is no busy time", () => {
    expect(computeFreeGaps(window, [])).toEqual([window]);
  });

  it("splits around a single busy interval in the middle", () => {
    const gaps = computeFreeGaps(window, [{ start: d(12), end: d(13) }]);
    expect(gaps).toEqual([
      { start: d(8), end: d(12) },
      { start: d(13), end: d(18) },
    ]);
  });

  it("clamps a busy interval that starts before the window", () => {
    const gaps = computeFreeGaps(window, [{ start: d(6), end: d(9) }]);
    expect(gaps).toEqual([{ start: d(9), end: d(18) }]);
  });

  it("clamps a busy interval that ends after the window", () => {
    const gaps = computeFreeGaps(window, [{ start: d(17), end: d(20) }]);
    expect(gaps).toEqual([{ start: d(8), end: d(17) }]);
  });

  it("ignores a busy interval entirely outside the window", () => {
    const gaps = computeFreeGaps(window, [{ start: d(19), end: d(20) }]);
    expect(gaps).toEqual([window]);
  });

  it("returns no gaps when busy intervals cover the whole window", () => {
    const gaps = computeFreeGaps(window, [{ start: d(6), end: d(20) }]);
    expect(gaps).toEqual([]);
  });

  it("merges overlapping busy intervals before computing gaps", () => {
    const gaps = computeFreeGaps(window, [
      { start: d(9), end: d(11) },
      { start: d(10), end: d(12) },
    ]);
    expect(gaps).toEqual([
      { start: d(8), end: d(9) },
      { start: d(12), end: d(18) },
    ]);
  });
});
