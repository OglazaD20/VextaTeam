import { env } from "@/lib/env";
import type { LatLng } from "./distance";

export interface WeatherSnapshot {
  tempC: number;
  condition: string;
  description: string;
  isRaining: boolean;
  windKph: number;
  sunrise: string | null;
  sunset: string | null;
}

interface OwmCurrentResponse {
  weather: { main: string; description: string }[];
  main: { temp: number };
  wind: { speed: number };
  sys?: { sunrise?: number; sunset?: number };
}

export async function getCurrentWeather(location: LatLng): Promise<WeatherSnapshot> {
  if (!env.WEATHER_API_KEY) {
    throw new Error("WEATHER_API_KEY is not set. Weather lookup is unavailable until it's configured.");
  }

  const url = new URL("https://api.openweathermap.org/data/2.5/weather");
  url.searchParams.set("lat", String(location.lat));
  url.searchParams.set("lon", String(location.lng));
  url.searchParams.set("units", "metric");
  url.searchParams.set("appid", env.WEATHER_API_KEY);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Weather lookup failed with status ${response.status}`);
  }

  const data: OwmCurrentResponse = await response.json();
  const main = data.weather[0]?.main ?? "Unknown";

  return {
    tempC: Math.round(data.main.temp),
    condition: main,
    description: data.weather[0]?.description ?? "",
    isRaining: /rain|drizzle|thunderstorm|snow/i.test(main),
    windKph: Math.round(data.wind.speed * 3.6),
    sunrise: data.sys?.sunrise ? new Date(data.sys.sunrise * 1000).toISOString() : null,
    sunset: data.sys?.sunset ? new Date(data.sys.sunset * 1000).toISOString() : null,
  };
}

export interface ForecastPoint {
  /** ISO timestamp for this 3-hour forecast step. */
  at: string;
  tempC: number;
  condition: string;
  isRaining: boolean;
  /** Probability of precipitation, 0-100. */
  precipitationChancePct: number;
  windKph: number;
}

interface OwmForecastResponse {
  list: {
    dt: number;
    main: { temp: number };
    weather: { main: string }[];
    pop: number;
    wind: { speed: number };
  }[];
}

/** Next ~24h of forecast in the 3-hour steps OpenWeatherMap's free tier provides. */
export async function getHourlyForecast(location: LatLng, hoursAhead = 24): Promise<ForecastPoint[]> {
  if (!env.WEATHER_API_KEY) {
    throw new Error("WEATHER_API_KEY is not set. Weather lookup is unavailable until it's configured.");
  }

  const url = new URL("https://api.openweathermap.org/data/2.5/forecast");
  url.searchParams.set("lat", String(location.lat));
  url.searchParams.set("lon", String(location.lng));
  url.searchParams.set("units", "metric");
  url.searchParams.set("cnt", String(Math.ceil(hoursAhead / 3)));
  url.searchParams.set("appid", env.WEATHER_API_KEY);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Forecast lookup failed with status ${response.status}`);
  }

  const data: OwmForecastResponse = await response.json();

  return data.list.map((point) => {
    const main = point.weather[0]?.main ?? "Unknown";
    return {
      at: new Date(point.dt * 1000).toISOString(),
      tempC: Math.round(point.main.temp),
      condition: main,
      isRaining: /rain|drizzle|thunderstorm|snow/i.test(main),
      precipitationChancePct: Math.round(point.pop * 100),
      windKph: Math.round(point.wind.speed * 3.6),
    };
  });
}

export interface AirQualitySnapshot {
  /** OpenWeatherMap AQI scale: 1 (good) to 5 (very poor). */
  aqi: number;
  label: "good" | "fair" | "moderate" | "poor" | "very poor";
}

const AQI_LABELS: AirQualitySnapshot["label"][] = ["good", "fair", "moderate", "poor", "very poor"];

interface OwmAirPollutionResponse {
  list: { main: { aqi: number } }[];
}

/** Best-effort — some API keys don't have air-quality data enabled, so this returns null rather than throwing. */
export async function getAirQuality(location: LatLng): Promise<AirQualitySnapshot | null> {
  if (!env.WEATHER_API_KEY) return null;

  try {
    const url = new URL("https://api.openweathermap.org/data/2.5/air_pollution");
    url.searchParams.set("lat", String(location.lat));
    url.searchParams.set("lon", String(location.lng));
    url.searchParams.set("appid", env.WEATHER_API_KEY);

    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const data: OwmAirPollutionResponse = await response.json();
    const aqi = data.list[0]?.main.aqi;
    if (!aqi || aqi < 1 || aqi > 5) return null;

    return { aqi, label: AQI_LABELS[aqi - 1] };
  } catch {
    return null;
  }
}
