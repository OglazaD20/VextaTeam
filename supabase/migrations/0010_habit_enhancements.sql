-- Habit tracker overhaul: reminders, pause (distinct from archive), manual ordering.

alter table public.habits
  add column reminder_enabled boolean not null default false,
  add column paused_at timestamptz,
  add column sort_order integer not null default 0;

create index habits_user_paused_idx on public.habits (user_id, paused_at);
