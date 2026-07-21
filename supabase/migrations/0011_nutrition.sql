-- Nutrition / calorie tracker: shared food cache + per-user logs and goals.

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  calories numeric not null,
  protein_g numeric not null default 0,
  fat_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fiber_g numeric not null default 0,
  serving_size numeric not null default 1,
  serving_unit text not null default 'serving',
  source text not null default 'usda' check (source in ('usda', 'custom')),
  external_id text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index foods_source_external_id_idx on public.foods (source, external_id)
  where external_id is not null;

alter table public.foods enable row level security;

-- Shared reference/cache data: any signed-in user can read and add cache entries
-- (e.g. from a USDA search), but only the row's own creator can edit/delete it —
-- API-sourced rows (created_by null) are effectively immutable via RLS.
create policy "foods_select_all" on public.foods
  for select using (auth.role() = 'authenticated');
create policy "foods_insert_authenticated" on public.foods
  for insert with check (auth.role() = 'authenticated');
create policy "foods_update_own" on public.foods
  for update using (auth.uid() = created_by) with check (auth.uid() = created_by);
create policy "foods_delete_own" on public.foods
  for delete using (auth.uid() = created_by);

create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  food_id uuid references public.foods(id) on delete set null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'drink')),
  logged_at timestamptz not null default now(),
  quantity numeric not null default 1,
  calories numeric not null,
  protein_g numeric not null,
  fat_g numeric not null,
  carbs_g numeric not null,
  fiber_g numeric not null,
  notes text,
  created_at timestamptz not null default now()
);

create index food_logs_user_logged_idx on public.food_logs (user_id, logged_at);

alter table public.food_logs enable row level security;
create policy "food_logs_all_own" on public.food_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  logged_at timestamptz not null default now(),
  amount_ml integer not null
);

create index water_logs_user_logged_idx on public.water_logs (user_id, logged_at);

alter table public.water_logs enable row level security;
create policy "water_logs_all_own" on public.water_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  logged_for_date date not null,
  weight_kg numeric,
  created_at timestamptz not null default now(),
  unique (user_id, logged_for_date)
);

alter table public.body_metrics enable row level security;
create policy "body_metrics_all_own" on public.body_metrics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.nutrition_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  daily_calorie_goal numeric not null default 2000,
  protein_goal_g numeric not null default 120,
  carbs_goal_g numeric not null default 250,
  fat_goal_g numeric not null default 65,
  fiber_goal_g numeric not null default 30,
  water_goal_ml numeric not null default 2000,
  height_cm numeric,
  updated_at timestamptz not null default now()
);

alter table public.nutrition_settings enable row level security;
create policy "nutrition_settings_all_own" on public.nutrition_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
