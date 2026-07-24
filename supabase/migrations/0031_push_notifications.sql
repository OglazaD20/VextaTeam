-- Web Push subscriptions (one row per browser/device a user has enabled
-- push on) plus the additional per-user preferences (quiet hours, sound)
-- that don't fit the existing notification_prefs jsonb. New notification
-- *type* toggles reuse that existing jsonb column — a missing key just
-- means "on" by default in application code, so no migration is needed to
-- add more types later.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
create policy "push_subscriptions_all_own" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.user_settings add column quiet_hours_start time;
alter table public.user_settings add column quiet_hours_end time;
alter table public.user_settings add column notification_sound boolean not null default true;
