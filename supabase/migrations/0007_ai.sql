create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_conversations_user_id_idx on public.ai_conversations (user_id, updated_at);

alter table public.ai_conversations enable row level security;

create policy "ai_conversations_all_own" on public.ai_conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger ai_conversations_set_updated_at
  before update on public.ai_conversations
  for each row execute function public.set_updated_at();

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'tool')),
  content text not null,
  tool_calls jsonb,
  created_at timestamptz not null default now()
);

create index ai_messages_conversation_id_idx on public.ai_messages (conversation_id, created_at);

alter table public.ai_messages enable row level security;

-- ai_messages has no direct user_id column; ownership is derived through its conversation.
create policy "ai_messages_all_via_conversation" on public.ai_messages
  for all using (
    exists (
      select 1 from public.ai_conversations c
      where c.id = ai_messages.conversation_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.ai_conversations c
      where c.id = ai_messages.conversation_id and c.user_id = auth.uid()
    )
  );

-- RAG context store (durable preferences/patterns, not live schedule data — see §10.4)
create table public.user_context_embeddings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null check (source_type in
    ('schedule_item', 'habit', 'chat_summary', 'preference_note')),
  source_id uuid,
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index user_context_embeddings_user_id_idx on public.user_context_embeddings (user_id);
create index user_context_embeddings_hnsw_idx on public.user_context_embeddings
  using hnsw (embedding vector_cosine_ops);

alter table public.user_context_embeddings enable row level security;

create policy "user_context_embeddings_all_own" on public.user_context_embeddings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
