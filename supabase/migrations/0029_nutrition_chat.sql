-- Nutrition Chat reuses the existing ai_conversations/ai_messages tables
-- (same conversation history mechanics as the main assistant) rather than a
-- parallel schema — a `kind` discriminator keeps the two chat threads apart.
alter table public.ai_conversations add column kind text not null default 'assistant'
  check (kind in ('assistant', 'nutrition'));
