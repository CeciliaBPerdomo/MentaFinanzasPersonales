begin;

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  institution text not null check (institution in ('Prex', 'BROU', 'BBVA')),
  kind text not null check (kind in ('cash', 'credit')),
  currency text not null check (currency in ('UYU', 'USD')),
  opening_balance numeric(12, 2) not null default 0
    check (abs(opening_balance) <= 100000000),
  opening_date date not null default current_date,
  created_at timestamptz not null default now(),
  constraint account_institution_kind check (
    (institution in ('Prex', 'BROU') and kind = 'cash')
    or (institution = 'BBVA' and kind = 'credit')
  ),
  constraint account_unique_currency unique (user_id, institution, kind, currency),
  constraint account_owner_currency unique (id, user_id, currency)
);

alter table public.accounts enable row level security;
revoke all on table public.accounts from anon, authenticated;
grant select, insert, update, delete on table public.accounts to authenticated;

create policy accounts_owner_access on public.accounts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter table public.transactions
  drop constraint transactions_currency_check,
  alter column currency drop default,
  add constraint transactions_currency_check check (currency in ('EUR', 'UYU', 'USD')),
  add column account_id uuid,
  add constraint transactions_account_owner_currency_fk
    foreign key (account_id, user_id, currency)
    references public.accounts (id, user_id, currency)
    on delete restrict;

alter table public.transactions
  add constraint transactions_account_required
  check (account_id is not null) not valid;

create index transactions_account_date_idx
  on public.transactions (account_id, occurred_on desc);

alter table public.goals
  drop constraint goals_currency_check,
  alter column currency drop default,
  add constraint goals_currency_check check (currency in ('EUR', 'UYU', 'USD'));

commit;