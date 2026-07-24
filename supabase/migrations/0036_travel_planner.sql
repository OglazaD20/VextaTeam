-- AI Travel Planner: trips with an AI-generated day-by-day itinerary (built
-- from real Geoapify place candidates, same "phrase from real data, never
-- invent a place" pattern as Discover) plus a packing checklist.

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  destination text not null,
  destination_lat double precision,
  destination_lng double precision,
  start_date date not null,
  end_date date not null,
  budget numeric,
  currency text not null default 'EUR',
  transportation text check (transportation in ('flight', 'train', 'car', 'bus', 'other')),
  status text not null default 'planning' check (status in ('planning', 'upcoming', 'active', 'completed', 'archived')),
  weather_summary text,
  packing_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trips_user_idx on public.trips (user_id, start_date);

alter table public.trips enable row level security;
create policy "trips_all_own" on public.trips
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.trip_itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  day_number smallint not null,
  start_time time,
  title text not null,
  type text not null default 'activity' check (type in
    ('attraction', 'restaurant', 'activity', 'transport', 'hotel', 'free_time')),
  place_name text,
  address text,
  lat double precision,
  lng double precision,
  estimated_cost numeric,
  estimated_duration_minutes integer,
  notes text,
  sort_order integer not null default 0,
  added_to_calendar boolean not null default false,
  created_at timestamptz not null default now()
);

create index trip_itinerary_items_trip_idx on public.trip_itinerary_items (trip_id, day_number, sort_order);

alter table public.trip_itinerary_items enable row level security;
create policy "trip_itinerary_items_all_own" on public.trip_itinerary_items
  for all using (
    exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid())
  );

create table public.trip_packing_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  item text not null,
  category text not null default 'general',
  is_packed boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index trip_packing_items_trip_idx on public.trip_packing_items (trip_id, sort_order);

alter table public.trip_packing_items enable row level security;
create policy "trip_packing_items_all_own" on public.trip_packing_items
  for all using (
    exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid())
  );
