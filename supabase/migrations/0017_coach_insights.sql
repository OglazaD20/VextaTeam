-- AI Coach: persisted insight runs per period, so the dashboard can show the
-- latest coaching without recomputing (an OpenAI call) on every page load.

create table public.coach_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  period text not null check (period in ('daily', 'weekly', 'monthly')),
  headline text not null,
  insights jsonb not null,
  signals jsonb not null,
  created_at timestamptz not null default now()
);

create index coach_insights_user_period_idx on public.coach_insights (user_id, period, created_at desc);

alter table public.coach_insights enable row level security;
create policy "coach_insights_all_own" on public.coach_insights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
