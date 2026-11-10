begin;

create table public.card_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source_account_id uuid not null,
  card_account_id uuid not null,
  currency text not null check (currency in ('UYU', 'USD')),
  amount numeric(12, 2) not null check (amount > 0 and amount <= 100000000),
  occurred_on date not null,
  created_at timestamptz not null default now(),
  constraint payment_distinct_accounts check (source_account_id <> card_account_id),
  constraint payment_source_owner_currency_fk foreign key (source_account_id, user_id, currency)
    references public.accounts (id, user_id, currency) on delete restrict,
  constraint payment_card_owner_currency_fk foreign key (card_account_id, user_id, currency)
    references public.accounts (id, user_id, currency) on delete restrict
);

create index card_payments_user_date_idx on public.card_payments (user_id, occurred_on desc);
create index card_payments_source_idx on public.card_payments (source_account_id);
create index card_payments_card_idx on public.card_payments (card_account_id);

alter table public.card_payments enable row level security;
revoke all on table public.card_payments from anon, authenticated;
grant select, insert, delete on table public.card_payments to authenticated;

create policy card_payments_owner_access on public.card_payments
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create function public.validate_card_payment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  source_kind text;
  source_opening date;
  card_kind text;
  card_opening date;
begin
  select kind, opening_date into source_kind, source_opening
    from public.accounts where id = new.source_account_id and user_id = new.user_id;
  select kind, opening_date into card_kind, card_opening
    from public.accounts where id = new.card_account_id and user_id = new.user_id;
  if source_kind is distinct from 'cash' or card_kind is distinct from 'credit' then
    raise exception 'El pago debe salir de una cuenta bancaria y dirigirse a una tarjeta propia.';
  end if;
  if new.occurred_on < source_opening or new.occurred_on < card_opening
    or new.occurred_on > (now() at time zone 'America/Montevideo')::date then
    raise exception 'La fecha debe ser posterior o igual a los saldos iniciales y no futura.';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_card_payment() from public, anon, authenticated;
create trigger validate_card_payment before insert on public.card_payments
  for each row execute function public.validate_card_payment();

commit;