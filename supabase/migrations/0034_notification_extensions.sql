-- Milestone 51: adds the remaining push categories from the spec (morning
-- summary, workout reminders, AI Coach suggestions, Discover
-- recommendations — the latter two fire only when the AI pipeline they
-- reference was already run for another reason, never on a new speculative
-- schedule) plus vibration and reminder-frequency preferences.

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in
  ('leave_now', 'break_reminder', 'weather', 'free_time',
   'reschedule', 'habit_skip', 'weekly_report',
   'task_reminder', 'water_reminder', 'meal_reminder', 'bedtime_reminder',
   'goal_reminder', 'finance_reminder', 'calendar_reminder',
   'morning_summary', 'workout_reminder', 'coach_suggestion', 'discover_recommendation'));

alter table public.user_settings add column vibration boolean not null default true;
alter table public.user_settings add column reminder_frequency text not null default 'normal'
  check (reminder_frequency in ('normal', 'reduced', 'minimal'));
