-- Cached AI finance insights, one per generation (latest wins) — same shape
-- as coach_insights so the finance panel doesn't call OpenAI on every load.

create table public.finance_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  headline text not null,
  insights jsonb not null,
  signals jsonb not null,
  created_at timestamptz not null default now()
);

create index finance_insights_user_created_idx on public.finance_insights (user_id, created_at desc);

alter table public.finance_insights enable row level security;
create policy "finance_insights_all_own" on public.finance_insights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
