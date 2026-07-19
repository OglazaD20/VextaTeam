-- profiles: one row per authenticated user, mirrors auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  timezone text not null default 'UTC',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
-- Inserts happen only via the handle_new_user trigger below (security definer),
-- so no insert policy is granted to end users directly.

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- user_settings: 1:1 with profiles, scheduling/notification preferences
create table public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  wake_time time not null default '07:00',
  sleep_time time not null default '23:00',
  working_hours jsonb not null default '{
    "mon": ["09:00", "17:00"], "tue": ["09:00", "17:00"], "wed": ["09:00", "17:00"],
    "thu": ["09:00", "17:00"], "fri": ["09:00", "17:00"], "sat": null, "sun": null
  }'::jsonb,
  chronotype text not null default 'flexible'
    check (chronotype in ('early_bird', 'night_owl', 'flexible')),
  default_task_buffer_minutes int not null default 10,
  focus_block_minutes int not null default 50,
  break_minutes int not null default 10,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  notification_prefs jsonb not null default '{
    "leave_now": true, "break_reminder": true, "weather": true,
    "free_time": true, "habit_skip": true, "weekly_report": true
  }'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "user_settings_all_own" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

-- Auto-provision profile + default settings when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );

  insert into public.user_settings (user_id) values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
