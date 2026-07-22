-- AI Memory: promotes user_context_embeddings (created alongside the AI
-- chat schema in 0007 with a pgvector column and HNSW index, but never
-- wired into any code) into the full second-brain feature — renamed to
-- memories, with the fields semantic search/timeline/pinning/tagging need.

alter table public.user_context_embeddings rename to memories;

alter table public.memories
  add column title text,
  add column summary text,
  add column category text,
  add column tags text[] not null default '{}',
  add column pinned boolean not null default false,
  add column favorited boolean not null default false,
  add column occurred_at timestamptz not null default now();

update public.memories set title = left(content, 80) where title is null;
alter table public.memories alter column title set not null;

alter table public.memories drop constraint user_context_embeddings_source_type_check;
alter table public.memories add constraint memories_source_type_check check (source_type in (
  'task', 'calendar_event', 'habit', 'goal', 'note', 'discover_activity',
  'nutrition', 'health', 'mood', 'finance', 'ai_conversation',
  'favorite_place', 'workout', 'reading', 'file',
  'chat_summary', 'preference_note'
));

-- One memory per (user, source record) — re-saving/editing the same item
-- upserts rather than duplicating.
create unique index memories_user_source_idx
  on public.memories (user_id, source_type, source_id)
  where source_id is not null;

create index memories_user_category_idx on public.memories (user_id, category);
create index memories_user_pinned_idx on public.memories (user_id, pinned) where pinned = true;
create index memories_user_occurred_idx on public.memories (user_id, occurred_at desc);

-- Semantic search: cosine similarity ranked, scoped to the caller's own
-- rows (RLS still applies on top of this since the function runs with
-- caller privileges, not security definer).
create or replace function public.match_memories(
  query_embedding vector(1536),
  match_user_id uuid,
  match_count int default 10
)
returns table (
  id uuid,
  title text,
  content text,
  summary text,
  category text,
  tags text[],
  source_type text,
  source_id uuid,
  occurred_at timestamptz,
  pinned boolean,
  favorited boolean,
  similarity float
)
language sql stable
as $$
  select
    m.id, m.title, m.content, m.summary, m.category, m.tags,
    m.source_type, m.source_id, m.occurred_at, m.pinned, m.favorited,
    1 - (m.embedding <=> query_embedding) as similarity
  from public.memories m
  where m.user_id = match_user_id and m.embedding is not null
  order by m.embedding <=> query_embedding
  limit match_count;
$$;

-- Related memories: nearest neighbors of a given memory's own embedding.
create or replace function public.match_related_memories(
  target_memory_id uuid,
  match_count int default 5
)
returns table (
  id uuid,
  title text,
  content text,
  category text,
  occurred_at timestamptz,
  similarity float
)
language sql stable
as $$
  select m.id, m.title, m.content, m.category, m.occurred_at,
    1 - (m.embedding <=> t.embedding) as similarity
  from public.memories m,
    (select embedding, user_id from public.memories where id = target_memory_id) t
  where m.id != target_memory_id and m.user_id = t.user_id and m.embedding is not null
  order by m.embedding <=> t.embedding
  limit match_count;
$$;
