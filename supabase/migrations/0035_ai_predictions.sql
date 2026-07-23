-- AI Predict: stores the latest batch of generated predictions per user.
-- Regenerating replaces the whole batch (deleted then re-inserted by the
-- server action) rather than accumulating history — predictions are a
-- snapshot of "right now," not a log worth keeping forever.
create table public.ai_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in
    ('goal', 'health', 'habit', 'finance', 'productivity')),
  prediction text not null,
  confidence_pct smallint not null check (confidence_pct between 0 and 100),
  reasoning text not null,
  recommendation text not null,
  related_entity_type text,
  related_entity_id uuid,
  created_at timestamptz not null default now()
);

create index ai_predictions_user_created_idx on public.ai_predictions (user_id, created_at desc);

alter table public.ai_predictions enable row level security;
create policy "ai_predictions_all_own" on public.ai_predictions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
