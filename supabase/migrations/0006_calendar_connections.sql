-- access_token_encrypted / refresh_token_encrypted hold ciphertext produced by the
-- application server (see docs/ARCHITECTURE.md §11) — never store raw OAuth tokens.
create table public.calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('google', 'outlook', 'apple')),
  account_email text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  scopes text[],
  sync_status text not null default 'active'
    check (sync_status in ('active', 'paused', 'error', 'revoked')),
  last_synced_at timestamptz,
  sync_cursor text,
  created_at timestamptz not null default now(),
  unique (user_id, provider, account_email)
);

create index calendar_connections_user_id_idx on public.calendar_connections (user_id);

alter table public.calendar_connections enable row level security;

create policy "calendar_connections_all_own" on public.calendar_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
