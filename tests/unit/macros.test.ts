import { describe, expect, it } from "vitest";

import { computeBmi, scaleMacros, sumMacros } from "@/lib/nutrition/macros";

describe("scaleMacros", () => {
  it("scales all fields by the quantity multiplier", () => {
    const base = {
      calories: 100,
      proteinG: 10,
      fatG: 5,
      carbsG: 20,
      fiberG: 2,
      sugarG: 8,
      sodiumMg: 50,
    };
    expect(scaleMacros(base, 2)).toEqual({
      calories: 200,
      proteinG: 20,
      fatG: 10,
      carbsG: 40,
      fiberG: 4,
      sugarG: 16,
      sodiumMg: 100,
    });
  });

  it("rounds to one decimal place", () => {
    const base = {
      calories: 33,
      proteinG: 1,
      fatG: 1,
      carbsG: 1,
      fiberG: 1,
      sugarG: 1,
      sodiumMg: 1,
    };
    expect(scaleMacros(base, 1 / 3).calories).toBeCloseTo(11, 1);
  });
});

describe("sumMacros", () => {
  it("sums an empty list to all zeros", () => {
    expect(sumMacros([])).toEqual({
      calories: 0,
      proteinG: 0,
      fatG: 0,
      carbsG: 0,
      fiberG: 0,
      sugarG: 0,
      sodiumMg: 0,
    });
  });

  it("sums multiple entries field-by-field", () => {
    const entries = [
      { calories: 100, proteinG: 10, fatG: 5, carbsG: 20, fiberG: 2, sugarG: 8, sodiumMg: 50 },
      { calories: 200, proteinG: 15, fatG: 8, carbsG: 30, fiberG: 3, sugarG: 12, sodiumMg: 80 },
    ];
    expect(sumMacros(entries)).toEqual({
      calories: 300,
      proteinG: 25,
      fatG: 13,
      carbsG: 50,
      fiberG: 5,
      sugarG: 20,
      sodiumMg: 130,
    });
  });
});

describe("computeBmi", () => {
  it("computes BMI from weight and height", () => {
    expect(computeBmi(70, 175)).toBeCloseTo(22.9, 1);
  });

  it("returns null when weight is missing", () => {
    expect(computeBmi(null, 175)).toBeNull();
  });

  it("returns null when height is missing", () => {
    expect(computeBmi(70, null)).toBeNull();
  });

  it("returns null for non-positive inputs", () => {
    expect(computeBmi(0, 175)).toBeNull();
    expect(computeBmi(70, 0)).toBeNull();
  });
});
