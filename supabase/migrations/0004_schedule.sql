create table public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in
    ('meeting', 'task', 'deadline', 'habit', 'appointment', 'break')),
  title text not null,
  description text,
  status text not null default 'planned' check (status in
    ('planned', 'in_progress', 'completed', 'skipped', 'cancelled')),
  priority smallint not null default 3 check (priority between 1 and 5),
  is_fixed boolean not null default false,
  estimated_duration_minutes int,
  actual_duration_minutes int,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  due_at timestamptz,
  location text,
  source text not null default 'lifeflow' check (source in
    ('lifeflow', 'google', 'outlook', 'apple', 'ai_suggested')),
  external_event_id text,
  habit_id uuid references public.habits(id) on delete cascade,
  parent_item_id uuid references public.schedule_items(id) on delete set null,
  ai_reasoning text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_items_valid_range check (
    scheduled_start is null or scheduled_end is null or scheduled_end > scheduled_start
  )
);

create index schedule_items_user_start_idx on public.schedule_items (user_id, scheduled_start);
create index schedule_items_user_status_idx on public.schedule_items (user_id, status);
create index schedule_items_user_due_idx on public.schedule_items (user_id, due_at);

alter table public.schedule_items enable row level security;

create policy "schedule_items_all_own" on public.schedule_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger schedule_items_set_updated_at
  before update on public.schedule_items
  for each row execute function public.set_updated_at();

create table public.reschedule_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  schedule_item_id uuid references public.schedule_items(id) on delete set null,
  reason text not null check (reason in ('delay', 'manual', 'conflict', 'ai_optimization')),
  previous_start timestamptz,
  previous_end timestamptz,
  new_start timestamptz,
  new_end timestamptz,
  triggered_by text not null check (triggered_by in ('user', 'ai', 'system')),
  created_at timestamptz not null default now()
);

create index reschedule_events_user_id_idx on public.reschedule_events (user_id);
create index reschedule_events_item_id_idx on public.reschedule_events (schedule_item_id);

alter table public.reschedule_events enable row level security;

create policy "reschedule_events_all_own" on public.reschedule_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
