begin;

alter table public.accounts
  drop constraint accounts_institution_check,
  drop constraint account_institution_kind,
  add constraint accounts_institution_check
    check (institution = btrim(institution) and char_length(institution) between 1 and 70);

commit;