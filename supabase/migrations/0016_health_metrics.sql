-- Manual health metrics logging (no Apple Health/Google Fit auto-sync is
-- possible from a web app — HealthKit is iOS-native-only and Google Fit is
-- being sunset in favor of Health Connect, which is Android-native-only.
-- This is a deliberate, user-approved manual-entry design, not a stopgap).

create table public.health_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  logged_for_date date not null,
  sleep_hours numeric,
  sleep_quality integer check (sleep_quality between 1 and 5),
  bedtime time,
  wake_time time,
  steps integer,
  calories_burned integer,
  resting_heart_rate integer,
  avg_heart_rate integer,
  active_minutes integer,
  exercise_type text,
  exercise_minutes integer,
  distance_km numeric,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, logged_for_date)
);

create index health_metrics_user_date_idx on public.health_metrics (user_id, logged_for_date desc);

alter table public.health_metrics enable row level security;
create policy "health_metrics_all_own" on public.health_metrics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
