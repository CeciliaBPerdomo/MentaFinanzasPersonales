begin;

create table public.credit_statements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  institution text not null default 'BBVA' check (institution = 'BBVA'),
  period date not null check (extract(day from period) = 1),
  closing_on date not null,
  due_on date not null,
  created_at timestamptz not null default now(),
  constraint statement_period_close check (
    closing_on >= period and closing_on < (period + interval '1 month')::date
  ),
  constraint statement_due_after_close check (due_on > closing_on),
  constraint statement_owner_period unique (user_id, period)
);

alter table public.credit_statements enable row level security;
revoke all on table public.credit_statements from anon, authenticated;
grant select, insert, update, delete on table public.credit_statements to authenticated;

create policy statements_owner_access on public.credit_statements
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter table public.transactions
  add column installment_count integer not null default 1
    check (installment_count between 1 and 120),
  add column first_statement_period date,
  add constraint installments_need_statement check (
    installment_count = 1 or first_statement_period is not null
  ),
  add constraint transaction_first_statement_fk
    foreign key (user_id, first_statement_period)
    references public.credit_statements (user_id, period)
    on delete restrict;

create function public.validate_credit_installments()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  account_kind text;
  account_institution text;
  statement_close date;
begin
  if new.first_statement_period is null then
    return new;
  end if;

  select kind, institution into account_kind, account_institution
    from public.accounts
    where id = new.account_id and user_id = new.user_id;

  if account_kind is distinct from 'credit'
    or account_institution is distinct from 'BBVA'
    or new.amount >= 0 then
    raise exception 'Solo las compras de Visa BBVA pueden tener un estado de cuenta y cuotas.';
  end if;

  if abs(new.amount) * 100 < new.installment_count then
    raise exception 'Cada cuota debe tener un importe de al menos un centesimo.';
  end if;

  select closing_on into statement_close
    from public.credit_statements
    where user_id = new.user_id and period = new.first_statement_period;

  if statement_close is null or new.occurred_on > statement_close then
    raise exception 'El primer cierre debe existir y no puede ser anterior a la compra.';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_credit_installments() from public, anon, authenticated;

create trigger validate_credit_installments
  before insert or update on public.transactions
  for each row execute function public.validate_credit_installments();

create function public.initialize_visa_statements()
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.credit_statements (period, closing_on, due_on)
  values
    ('2026-11-01', '2026-11-05', '2026-11-19'),
    ('2026-12-01', '2026-12-10', '2026-12-24')
  on conflict (user_id, period) do nothing;
$$;

revoke all on function public.initialize_visa_statements() from public, anon, authenticated;
grant execute on function public.initialize_visa_statements() to authenticated;

commit;