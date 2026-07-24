import { CloudRainIcon, SunIcon, WindIcon } from "lucide-react";

import { getCurrentWeather, getHourlyForecast } from "@/lib/activities/weather-client";
import { computeWeatherSuggestions } from "@/lib/weather/planner";
import { createClient } from "@/lib/supabase/server";

/**
 * Best-effort weather-driven suggestions for the day — silently renders
 * nothing if the user has no saved location or the weather API isn't
 * configured/reachable, since this is a nice-to-have overlay, never a
 * blocking dependency for the page it's embedded in.
 */
export async function WeatherImpactBanner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: settings } = await supabase
    .from("user_settings")
    .select("default_lat, default_lng")
    .eq("user_id", user.id)
    .maybeSingle();

  if (settings?.default_lat == null || settings?.default_lng == null) return null;

  const location = { lat: settings.default_lat, lng: settings.default_lng };

  let current;
  let forecast: Awaited<ReturnType<typeof getHourlyForecast>> = [];
  try {
    [current, forecast] = await Promise.all([
      getCurrentWeather(location),
      getHourlyForecast(location).catch(() => []),
    ]);
  } catch {
    return null;
  }

  const suggestions = computeWeatherSuggestions(current, forecast).slice(0, 2);
  if (suggestions.length === 0) return null;

  return (
    <div className="glass-surface flex flex-col gap-2 rounded-2xl border border-border p-3.5">
      <div className="flex items-center gap-2 text-sm">
        {current.isRaining ? (
          <CloudRainIcon className="size-4 text-primary" />
        ) : current.windKph >= 30 ? (
          <WindIcon className="size-4 text-primary" />
        ) : (
          <SunIcon className="size-4 text-primary" />
        )}
        <span className="font-medium">
          {current.tempC}°C, {current.description || current.condition}
        </span>
      </div>
      <ul className="flex flex-col gap-1">
        {suggestions.map((s) => (
          <li key={s.type} className="text-sm text-muted-foreground">
            {s.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
