import { describe, expect, it } from "vitest";

import {
  computeWeatherSuggestions,
  isGoodForHiking,
  isPleasantForAWalk,
  needsUmbrella,
  shouldDelayCycling,
  shouldMoveOutdoorActivityIndoors,
} from "@/lib/weather/planner";
import type { ForecastPoint, WeatherSnapshot } from "@/lib/activities/weather-client";

function weather(overrides: Partial<WeatherSnapshot> = {}): WeatherSnapshot {
  return {
    tempC: 20,
    condition: "Clear",
    description: "clear sky",
    isRaining: false,
    windKph: 10,
    sunrise: null,
    sunset: null,
    ...overrides,
  };
}

function forecastPoint(overrides: Partial<ForecastPoint> = {}): ForecastPoint {
  return {
    at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    tempC: 20,
    condition: "Clear",
    isRaining: false,
    precipitationChancePct: 0,
    windKph: 10,
    ...overrides,
  };
}

describe("shouldMoveOutdoorActivityIndoors", () => {
  it("is true when it's currently raining", () => {
    expect(shouldMoveOutdoorActivityIndoors(weather({ isRaining: true, condition: "Rain" }), [])).toBe(true);
  });

  it("is true when wind is high even without rain", () => {
    expect(shouldMoveOutdoorActivityIndoors(weather({ windKph: 40 }), [])).toBe(true);
  });

  it("is true when rain is expected within the lookahead window", () => {
    const forecast = [forecastPoint({ isRaining: true, condition: "Rain" })];
    expect(shouldMoveOutdoorActivityIndoors(weather(), forecast)).toBe(true);
  });

  it("is false in clear, calm conditions with no rain forecast", () => {
    expect(shouldMoveOutdoorActivityIndoors(weather(), [forecastPoint()])).toBe(false);
  });
});

describe("isPleasantForAWalk", () => {
  it("is true in mild, dry, calm conditions", () => {
    expect(isPleasantForAWalk(weather({ tempC: 20 }))).toBe(true);
  });

  it("is false when too cold", () => {
    expect(isPleasantForAWalk(weather({ tempC: 2 }))).toBe(false);
  });

  it("is false when raining", () => {
    expect(isPleasantForAWalk(weather({ isRaining: true, tempC: 20 }))).toBe(false);
  });
});

describe("isGoodForHiking", () => {
  it("is true on a clear mild day", () => {
    expect(isGoodForHiking(weather({ condition: "Clear", tempC: 18 }))).toBe(true);
  });

  it("is false in stormy conditions", () => {
    expect(isGoodForHiking(weather({ condition: "Thunderstorm", isRaining: true }))).toBe(false);
  });
});

describe("shouldDelayCycling", () => {
  it("is true when currently raining", () => {
    expect(shouldDelayCycling(weather({ isRaining: true }), [])).toBe(true);
  });

  it("is false in calm, dry weather", () => {
    expect(shouldDelayCycling(weather(), [forecastPoint()])).toBe(false);
  });
});

describe("needsUmbrella", () => {
  it("is true when rain is in the near forecast", () => {
    expect(needsUmbrella(weather(), [forecastPoint({ isRaining: true })])).toBe(true);
  });

  it("is false with no rain currently or upcoming", () => {
    expect(needsUmbrella(weather(), [forecastPoint()])).toBe(false);
  });
});

describe("computeWeatherSuggestions", () => {
  it("suggests moving indoors and bringing an umbrella when raining", () => {
    const suggestions = computeWeatherSuggestions(weather({ isRaining: true, condition: "Rain" }), []);
    const types = suggestions.map((s) => s.type);
    expect(types).toContain("move_indoors");
    expect(types).toContain("bring_umbrella");
  });

  it("suggests a walk on a pleasant day with no rain in sight", () => {
    const suggestions = computeWeatherSuggestions(weather({ tempC: 20 }), [forecastPoint()]);
    const types = suggestions.map((s) => s.type);
    expect(types).toContain("good_for_walk");
    expect(types).not.toContain("move_indoors");
  });
});
