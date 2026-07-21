import { env } from "@/lib/env";
import type { LatLng } from "./distance";

export interface WeatherSnapshot {
  tempC: number;
  condition: string;
  description: string;
  isRaining: boolean;
  windKph: number;
}

interface OwmCurrentResponse {
  weather: { main: string; description: string }[];
  main: { temp: number };
  wind: { speed: number };
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
  };
}
