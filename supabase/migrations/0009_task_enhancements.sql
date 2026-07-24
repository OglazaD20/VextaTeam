-- Task management overhaul: richer schedule_items, tags, attachments.

alter table public.schedule_items
  add column category text,
  add column notes text,
  add column recurrence_rule jsonb,
  add column archived_at timestamptz,
  add column sort_order integer not null default 0;

alter table public.schedule_items
  drop constraint schedule_items_type_check,
  add constraint schedule_items_type_check
    check (type in ('meeting','task','deadline','habit','appointment','break','activity'));

create index schedule_items_user_archived_idx on public.schedule_items (user_id, archived_at);

-- Tags (many-to-many so they're reusable/autocompletable, not a denormalized text[])
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  color text not null default '#6366f1',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.tags enable row level security;
create policy "tags_all_own" on public.tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.schedule_item_tags (
  schedule_item_id uuid not null references public.schedule_items(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (schedule_item_id, tag_id)
);

alter table public.schedule_item_tags enable row level security;

create policy "schedule_item_tags_all_via_item" on public.schedule_item_tags
  for all using (
    exists (
      select 1 from public.schedule_items si
      where si.id = schedule_item_tags.schedule_item_id and si.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.schedule_items si
      where si.id = schedule_item_tags.schedule_item_id and si.user_id = auth.uid()
    )
  );

-- Attachments (Supabase Storage bucket + metadata table)
create table public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  schedule_item_id uuid not null references public.schedule_items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  file_size_bytes integer not null,
  mime_type text not null,
  created_at timestamptz not null default now()
);

create index task_attachments_item_idx on public.task_attachments (schedule_item_id);

alter table public.task_attachments enable row level security;
create policy "task_attachments_all_own" on public.task_attachments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', false)
on conflict (id) do nothing;

create policy "task_attachments_storage_select_own" on storage.objects
  for select using (
    bucket_id = 'task-attachments' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "task_attachments_storage_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'task-attachments' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "task_attachments_storage_delete_own" on storage.objects
  for delete using (
    bucket_id = 'task-attachments' and (storage.foldername(name))[1] = auth.uid()::text
  );
