-- Gamification: XP/levels/coins plus achievement unlocks. Achievement
-- *definitions* live in code (lib/gamification/achievements.ts) — only a
-- user's progress/unlocks are stored here, so adding new achievements never
-- needs a migration.

create table public.user_stats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  xp integer not null default 0,
  coins integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.user_stats enable row level security;
create policy "user_stats_all_own" on public.user_stats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id text not null,
  progress_current numeric not null default 0,
  unlocked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

create index user_achievements_user_idx on public.user_achievements (user_id);

alter table public.user_achievements enable row level security;
create policy "user_achievements_all_own" on public.user_achievements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source text not null,
  related_id text,
  xp_awarded integer not null default 0,
  coins_awarded integer not null default 0,
  created_at timestamptz not null default now()
);

create index xp_events_user_created_idx on public.xp_events (user_id, created_at desc);

-- Prevents double-awarding XP for the same concrete event (e.g. completing
-- the same task twice, unlocking the same achievement twice).
create unique index xp_events_dedupe_idx on public.xp_events (user_id, source, related_id)
  where related_id is not null;

alter table public.xp_events enable row level security;
create policy "xp_events_all_own" on public.xp_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
