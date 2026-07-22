-- AI Nutrition Chat now estimates a food's nutrition from its own knowledge
-- instead of matching it against the foods search cache, so chat-logged
-- entries need their own display name when there's no food_id to join on.
alter table public.food_logs add column name text;
