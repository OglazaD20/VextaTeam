-- Discover: lets a user save a place or event suggestion for later. The full
-- suggestion is kept as jsonb in `data` so the card can be re-rendered exactly
-- as shown (title/pitch/hours/travel time/etc.) without re-querying Geoapify
-- or Ticketmaster, whose result shape differs between the two kinds.

create table public.saved_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('place', 'event')),
  title text not null,
  subtitle text not null,
  lat double precision not null,
  lng double precision not null,
  starts_at timestamptz,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create index saved_activities_user_created_idx
  on public.saved_activities (user_id, created_at desc);

alter table public.saved_activities enable row level security;
create policy "saved_activities_all_own" on public.saved_activities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
