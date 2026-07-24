-- Lets users pick which Health dashboard cards to show (Milestone 38 redesign).
alter table public.user_settings add column visible_health_cards jsonb not null default
  '["sleep", "steps", "calories_burned", "heart_rate", "workouts", "water", "weight"]'::jsonb;
