create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  schedule_item_id uuid references public.schedule_items(id) on delete set null,
  planned_duration_minutes int not null,
  actual_duration_minutes int,
  pomodoro_cycles int not null default 0,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  interrupted boolean not null default false,
  mood_after smallint check (mood_after between 1 and 5),
  energy_after smallint check (energy_after between 1 and 5)
);

create index focus_sessions_user_id_idx on public.focus_sessions (user_id, started_at);

alter table public.focus_sessions enable row level security;

create policy "focus_sessions_all_own" on public.focus_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.mood_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  logged_at timestamptz not null default now(),
  mood smallint not null check (mood between 1 and 5),
  energy smallint check (energy between 1 and 5),
  note text
);

create index mood_logs_user_id_idx on public.mood_logs (user_id, logged_at);

alter table public.mood_logs enable row level security;

create policy "mood_logs_all_own" on public.mood_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
