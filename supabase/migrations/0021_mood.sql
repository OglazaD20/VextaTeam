-- Extends the mood_logs table from 0005 (created alongside Focus Mode as a
-- lightweight "mood after a session" companion, but never built into a full
-- tracking feature) with the rest of the dimensions and a date key for
-- calendar/timeline queries. Multiple check-ins per day are expected —
-- mood shifts through the day — so this stays one-row-per-check-in, not
-- unique per date like habit_logs/health_metrics.

alter table public.mood_logs
  add column stress smallint check (stress between 1 and 5),
  add column motivation smallint check (motivation between 1 and 5),
  add column productivity smallint check (productivity between 1 and 5),
  add column happiness smallint check (happiness between 1 and 5),
  add column sleep_quality smallint check (sleep_quality between 1 and 5),
  add column anxiety smallint check (anxiety between 1 and 5),
  add column confidence smallint check (confidence between 1 and 5),
  add column focus smallint check (focus between 1 and 5),
  add column logged_for_date date not null default (now()::date);

create index mood_logs_user_date_idx on public.mood_logs (user_id, logged_for_date);
