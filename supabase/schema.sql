begin;

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 70),
  category text not null check (category in ('Compras', 'Restaurantes', 'Servicios', 'Otros', 'Ingresos')),
  amount numeric(12, 2) not null check (amount <> 0 and abs(amount) <= 100000000),
  currency text not null default 'EUR' check (currency = 'EUR'),
  occurred_on date not null default current_date,
  created_at timestamptz not null default now(),
  constraint transaction_category_sign check (
    (category = 'Ingresos' and amount > 0)
    or (category <> 'Ingresos' and amount < 0)
  )
);

create index transactions_user_date_idx
  on public.transactions (user_id, occurred_on desc, created_at desc);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 70),
  saved numeric(12, 2) not null default 0 check (saved >= 0 and saved <= 100000000),
  target numeric(12, 2) not null check (target > 0 and target <= 100000000),
  currency text not null default 'EUR' check (currency = 'EUR'),
  created_at timestamptz not null default now()
);

create index goals_user_idx on public.goals (user_id);

alter table public.transactions enable row level security;
alter table public.goals enable row level security;

revoke all on table public.transactions, public.goals from anon, authenticated;
grant select, insert, update, delete on table public.transactions, public.goals to authenticated;

create policy transactions_owner_access on public.transactions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy goals_owner_access on public.goals
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

commit;