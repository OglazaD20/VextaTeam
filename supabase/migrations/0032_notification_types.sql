-- Extends the notification type list for Milestone 40 (push notifications):
-- task/water/meal/bedtime/goal/finance/calendar reminders, on top of the
-- existing contextual types.
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in
  ('leave_now', 'break_reminder', 'weather', 'free_time',
   'reschedule', 'habit_skip', 'weekly_report',
   'task_reminder', 'water_reminder', 'meal_reminder', 'bedtime_reminder',
   'goal_reminder', 'finance_reminder', 'calendar_reminder'));
