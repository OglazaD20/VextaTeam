import { describe, expect, it } from "vitest";

import { isWeatherUnfavorableFor } from "@/lib/activities/rank";

describe("isWeatherUnfavorableFor", () => {
  it("is true for an outdoor category when the weather is bad for outdoors", () => {
    expect(isWeatherUnfavorableFor("parks", true)).toBe(true);
    expect(isWeatherUnfavorableFor("lakes_beaches", true)).toBe(true);
  });

  it("is false for an outdoor category when the weather is fine", () => {
    expect(isWeatherUnfavorableFor("parks", false)).toBe(false);
  });

  it("is false for an indoor category regardless of weather", () => {
    expect(isWeatherUnfavorableFor("museums", true)).toBe(false);
    expect(isWeatherUnfavorableFor("cinema", true)).toBe(false);
  });
});
