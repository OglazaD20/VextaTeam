-- Optional home location for weather-aware AI planning and as a Discover
-- default (so it doesn't have to re-ask browser geolocation every time).

alter table public.user_settings
  add column default_lat numeric,
  add column default_lng numeric;
