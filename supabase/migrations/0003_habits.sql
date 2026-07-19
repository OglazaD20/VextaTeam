create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  icon text,
  category text check (category in
    ('sleep', 'fitness', 'hydration', 'reading', 'mindfulness', 'movement', 'custom')),
  cadence text not null default 'daily' check (cadence in ('daily', 'weekly', 'custom')),
  target_value numeric,
  target_unit text,
  preferred_time time,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index habits_user_id_idx on public.habits (user_id);

alter table public.habits enable row level security;

create policy "habits_all_own" on public.habits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  logged_for_date date not null,
  completed boolean not null default true,
  value numeric,
  created_at timestamptz not null default now(),
  unique (habit_id, logged_for_date)
);

create index habit_logs_habit_id_idx on public.habit_logs (habit_id);
create index habit_logs_user_id_date_idx on public.habit_logs (user_id, logged_for_date);

alter table public.habit_logs enable row level security;

create policy "habit_logs_all_own" on public.habit_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
