-- AI Activity Discovery: persisted suggestion runs so "recent suggestions"
-- doesn't require re-calling external APIs on every visit.

create table public.activity_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  categories text[] not null,
  filters jsonb not null,
  results jsonb not null,
  created_at timestamptz not null default now()
);

create index activity_suggestions_user_created_idx
  on public.activity_suggestions (user_id, created_at desc);

alter table public.activity_suggestions enable row level security;
create policy "activity_suggestions_all_own" on public.activity_suggestions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
