-- Subtasks: a lightweight checklist attached to a schedule_item.

create table public.task_subtasks (
  id uuid primary key default gen_random_uuid(),
  schedule_item_id uuid not null references public.schedule_items(id) on delete cascade,
  title text not null,
  is_completed boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index task_subtasks_item_idx on public.task_subtasks (schedule_item_id, sort_order);

alter table public.task_subtasks enable row level security;

create policy "task_subtasks_all_via_item" on public.task_subtasks
  for all using (
    exists (
      select 1 from public.schedule_items si
      where si.id = task_subtasks.schedule_item_id and si.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.schedule_items si
      where si.id = task_subtasks.schedule_item_id and si.user_id = auth.uid()
    )
  );
