-- Personal Finance: a single transaction ledger (income + expense) plus
-- subscriptions/recurring payments, per-category monthly budgets, loans,
-- and manually-valued assets (investments/savings/property) for net worth.
-- Category values are validated in the app layer (zod), not a DB check —
-- same approach already used for Discover's category tags.

create table public.finance_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  currency text not null default 'EUR',
  monthly_income_estimate numeric,
  updated_at timestamptz not null default now()
);

alter table public.finance_settings enable row level security;
create policy "finance_settings_all_own" on public.finance_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.finance_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  amount numeric not null check (amount > 0),
  currency text not null default 'EUR',
  billing_cycle text not null check (billing_cycle in ('weekly', 'monthly', 'yearly')),
  category text not null default 'bills',
  next_billing_date date,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create index finance_subscriptions_user_active_idx on public.finance_subscriptions (user_id, is_active);

alter table public.finance_subscriptions enable row level security;
create policy "finance_subscriptions_all_own" on public.finance_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null check (amount > 0),
  currency text not null default 'EUR',
  category text not null,
  description text,
  occurred_at timestamptz not null default now(),
  subscription_id uuid references public.finance_subscriptions(id) on delete set null,
  receipt_storage_path text,
  created_at timestamptz not null default now()
);

create index transactions_user_occurred_idx on public.transactions (user_id, occurred_at desc);
create index transactions_user_type_occurred_idx on public.transactions (user_id, type, occurred_at desc);

alter table public.transactions enable row level security;
create policy "transactions_all_own" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.finance_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  monthly_limit numeric not null check (monthly_limit > 0),
  created_at timestamptz not null default now(),
  unique (user_id, category)
);

alter table public.finance_budgets enable row level security;
create policy "finance_budgets_all_own" on public.finance_budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.finance_loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  principal_amount numeric not null check (principal_amount > 0),
  remaining_balance numeric not null check (remaining_balance >= 0),
  interest_rate_pct numeric,
  monthly_payment numeric,
  start_date date,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.finance_loans enable row level security;
create policy "finance_loans_all_own" on public.finance_loans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.finance_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  asset_type text not null check (asset_type in ('investment', 'savings', 'property', 'other')),
  current_value numeric not null check (current_value >= 0),
  currency text not null default 'EUR',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.finance_assets enable row level security;
create policy "finance_assets_all_own" on public.finance_assets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger finance_assets_set_updated_at
  before update on public.finance_assets
  for each row execute function public.set_updated_at();

-- Private bucket for receipt photos, same pattern as task-attachments (0009).
insert into storage.buckets (id, name, public)
values ('receipt-images', 'receipt-images', false)
on conflict (id) do nothing;

create policy "receipt_images_storage_select_own" on storage.objects
  for select using (
    bucket_id = 'receipt-images' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "receipt_images_storage_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'receipt-images' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "receipt_images_storage_delete_own" on storage.objects
  for delete using (
    bucket_id = 'receipt-images' and (storage.foldername(name))[1] = auth.uid()::text
  );
