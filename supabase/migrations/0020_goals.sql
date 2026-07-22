-- Goals system: categorized goals with milestones, numeric or milestone-based
-- progress, and optional linking from schedule_items so tasks can count
-- toward a goal's progress (cross-module integration).

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'personal' check (category in
    ('fitness', 'business', 'learning', 'finance', 'reading', 'career',
     'travel', 'personal', 'health', 'custom')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  color text,
  icon text,
  deadline date,
  target_value numeric,
  current_value numeric not null default 0,
  unit text,
  manual_progress_pct smallint check (manual_progress_pct between 0 and 100),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index goals_user_status_idx on public.goals (user_id, status);

alter table public.goals enable row level security;
create policy "goals_all_own" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger goals_set_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

create table public.goal_milestones (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  title text not null,
  is_completed boolean not null default false,
  sort_order int not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index goal_milestones_goal_idx on public.goal_milestones (goal_id, sort_order);

alter table public.goal_milestones enable row level security;
create policy "goal_milestones_all_own" on public.goal_milestones
  for all using (
    exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid())
  );

alter table public.schedule_items
  add column goal_id uuid references public.goals(id) on delete set null;

create index schedule_items_goal_idx on public.schedule_items (goal_id) where goal_id is not null;
