create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in
    ('leave_now', 'break_reminder', 'weather', 'free_time',
     'reschedule', 'habit_skip', 'weekly_report')),
  title text not null,
  body text not null,
  related_item_id uuid references public.schedule_items(id) on delete set null,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications_all_own" on public.notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  productive_minutes int,
  tasks_completed int,
  tasks_planned int,
  focus_score smallint check (focus_score between 0 and 100),
  habit_streak_summary jsonb,
  mood_trend jsonb,
  ai_recommendations text[],
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create index weekly_reports_user_id_idx on public.weekly_reports (user_id, week_start desc);

alter table public.weekly_reports enable row level security;

create policy "weekly_reports_all_own" on public.weekly_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
