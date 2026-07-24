-- AI Automation builder: IF/THEN workflows with AND/OR condition groups,
-- multiple actions, schedule- or event-based triggers, plus AI-generated
-- automations and AI-suggested automations based on real observed behavior.
--
-- Definitions (trigger/condition_groups/actions) are stored as jsonb rather
-- than a rigid relational shape, mirroring the code-defined-taxonomy pattern
-- used elsewhere (achievements, rewards) — the fixed vocabulary of trigger
-- kinds/condition types/action types lives in lib/automations/types.ts and
-- is validated there and in the zod schema at the server-action boundary,
-- not enforced by the database.

-- Tracks when this user's account last had proactive automation suggestions
-- generated, so the weekly cron only regenerates them roughly once a week
-- per user instead of every ~15-minute poll.
alter table public.profiles add column automations_last_suggested_at timestamptz;

create table public.automations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  enabled boolean not null default true,
  source text not null default 'manual' check (source in ('manual', 'ai_generated')),
  trigger jsonb not null,
  -- Outer array = OR, each inner array = a group of conditions ANDed together.
  condition_groups jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  last_run_at timestamptz,
  -- For schedule triggers: the local date (YYYY-MM-DD) it last fired on, so
  -- the ~15-minute cron poll never fires the same daily/weekly automation twice.
  last_fired_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index automations_user_enabled_idx on public.automations (user_id, enabled);

alter table public.automations enable row level security;
create policy "automations_all_own" on public.automations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.automations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  ran_at timestamptz not null default now(),
  status text not null check (status in ('matched', 'skipped', 'error')),
  actions_taken jsonb not null default '[]'::jsonb,
  error_message text
);

create index automation_runs_automation_ran_idx on public.automation_runs (automation_id, ran_at desc);

alter table public.automation_runs enable row level security;
create policy "automation_runs_all_own" on public.automation_runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.automation_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  -- The real computed stats behind the suggestion (e.g. completion rates by
  -- weekday) — never a fabricated claim, always traceable to real data.
  evidence jsonb not null,
  proposed_trigger jsonb not null,
  proposed_condition_groups jsonb not null default '[]'::jsonb,
  proposed_actions jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'dismissed')),
  created_at timestamptz not null default now()
);

create index automation_suggestions_user_status_idx on public.automation_suggestions (user_id, status);

alter table public.automation_suggestions enable row level security;
create policy "automation_suggestions_all_own" on public.automation_suggestions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
