-- Rewards: cosmetic unlocks (accent themes/avatar frames/celebration
-- effects) granted automatically when their linked achievement unlocks.
-- Reward *definitions* live in code (lib/rewards/rewards.ts) — only
-- ownership and the user's current per-category equip choice live here.

alter table public.user_stats add column achievements_last_seen_at timestamptz not null default now();

create table public.user_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reward_id text not null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, reward_id)
);

create index user_rewards_user_idx on public.user_rewards (user_id);

alter table public.user_rewards enable row level security;
create policy "user_rewards_all_own" on public.user_rewards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.user_reward_equips (
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('theme', 'frame', 'effect')),
  reward_id text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, category)
);

alter table public.user_reward_equips enable row level security;
create policy "user_reward_equips_all_own" on public.user_reward_equips
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
