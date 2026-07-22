import { describe, expect, it } from "vitest";

import { computeServingMultiplier } from "@/lib/nutrition/quantity";

describe("computeServingMultiplier", () => {
  it("scales grams against a gram-based serving size", () => {
    expect(computeServingMultiplier(150, null, 100, "g")).toBe(1.5);
  });

  it("converts ounces to grams before dividing", () => {
    const result = computeServingMultiplier(150, null, 3, "oz");
    expect(result).toBeCloseTo(150 / (3 * 28.35), 3);
  });

  it("uses the serving count directly when no gram amount is given", () => {
    expect(computeServingMultiplier(null, 2, 1, "serving")).toBe(2);
  });

  it("defaults to a single serving when nothing is specified", () => {
    expect(computeServingMultiplier(null, null, 100, "g")).toBe(1);
  });
});
