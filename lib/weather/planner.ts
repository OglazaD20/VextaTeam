import type { ForecastPoint, WeatherSnapshot } from "@/lib/activities/weather-client";

/**
 * Pure, deterministic weather-driven suggestion rules — no AI involved.
 * Every threshold here is a plain, explainable rule (e.g. "rain expected in
 * the next 3 hours" or "wind over 30 km/h"), not a model guess, so the same
 * inputs always produce the same suggestion.
 */

export type WeatherSuggestionType =
  | "move_indoors"
  | "bring_umbrella"
  | "good_for_walk"
  | "good_for_hiking"
  | "delay_cycling"
  | "good_for_outdoor_workout";

export interface WeatherSuggestion {
  type: WeatherSuggestionType;
  message: string;
}

const RAIN_LOOKAHEAD_HOURS = 3;
const PLEASANT_TEMP_MIN_C = 15;
const PLEASANT_TEMP_MAX_C = 26;
const HIGH_WIND_KPH = 30;
const COLD_TEMP_C = 5;
const HOT_TEMP_C = 30;

function rainWithinHours(forecast: ForecastPoint[], hours: number): ForecastPoint | null {
  const cutoff = Date.now() + hours * 60 * 60 * 1000;
  return (
    forecast.find((point) => point.isRaining && new Date(point.at).getTime() <= cutoff) ?? null
  );
}

/** Whether an outdoor plan should be moved indoors right now or very soon. */
export function shouldMoveOutdoorActivityIndoors(
  current: WeatherSnapshot,
  forecast: ForecastPoint[],
): boolean {
  if (current.isRaining || current.windKph >= HIGH_WIND_KPH) return true;
  return rainWithinHours(forecast, RAIN_LOOKAHEAD_HOURS) !== null;
}

export function isPleasantForAWalk(current: WeatherSnapshot): boolean {
  return (
    !current.isRaining &&
    current.windKph < HIGH_WIND_KPH &&
    current.tempC >= PLEASANT_TEMP_MIN_C &&
    current.tempC <= PLEASANT_TEMP_MAX_C
  );
}

export function isGoodForHiking(current: WeatherSnapshot): boolean {
  return (
    /clear|clouds/i.test(current.condition) &&
    !current.isRaining &&
    current.tempC >= PLEASANT_TEMP_MIN_C - 5 &&
    current.tempC <= PLEASANT_TEMP_MAX_C + 4 &&
    current.windKph < HIGH_WIND_KPH
  );
}

export function shouldDelayCycling(current: WeatherSnapshot, forecast: ForecastPoint[]): boolean {
  return (
    current.isRaining ||
    current.windKph >= HIGH_WIND_KPH ||
    rainWithinHours(forecast, RAIN_LOOKAHEAD_HOURS) !== null
  );
}

export function needsUmbrella(current: WeatherSnapshot, forecast: ForecastPoint[]): boolean {
  return current.isRaining || rainWithinHours(forecast, RAIN_LOOKAHEAD_HOURS) !== null;
}

/**
 * Builds the full set of applicable suggestions for the current weather —
 * the caller decides which ones are relevant to show (e.g. only
 * "move_indoors" when there's actually an outdoor item scheduled today).
 */
export function computeWeatherSuggestions(
  current: WeatherSnapshot,
  forecast: ForecastPoint[],
): WeatherSuggestion[] {
  const suggestions: WeatherSuggestion[] = [];

  if (shouldMoveOutdoorActivityIndoors(current, forecast)) {
    suggestions.push({
      type: "move_indoors",
      message: current.isRaining
        ? "It's raining — consider moving outdoor plans indoors."
        : current.windKph >= HIGH_WIND_KPH
          ? `Wind is up to ${current.windKph} km/h — outdoor plans may be uncomfortable.`
          : "Rain is expected soon — consider moving outdoor plans indoors.",
    });
  }

  if (needsUmbrella(current, forecast)) {
    suggestions.push({ type: "bring_umbrella", message: "Bring an umbrella today." });
  }

  if (shouldDelayCycling(current, forecast)) {
    suggestions.push({ type: "delay_cycling", message: "Not great cycling weather right now." });
  } else if (isPleasantForAWalk(current)) {
    suggestions.push({
      type: "good_for_walk",
      message: `It's ${current.tempC}°C and clear — good weather for a walk.`,
    });
  }

  if (isGoodForHiking(current)) {
    suggestions.push({ type: "good_for_hiking", message: "Great conditions for hiking today." });
  }

  if (
    !shouldMoveOutdoorActivityIndoors(current, forecast) &&
    current.tempC > COLD_TEMP_C &&
    current.tempC < HOT_TEMP_C
  ) {
    suggestions.push({ type: "good_for_outdoor_workout", message: "Good conditions for an outdoor workout." });
  }

  return suggestions;
}
