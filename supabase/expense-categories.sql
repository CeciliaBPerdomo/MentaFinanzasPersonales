begin;

alter table public.transactions
  drop constraint transactions_category_check,
  add constraint transactions_category_check check (
    category in (
      'Compras', 'Restaurantes', 'Servicios', 'Otros', 'Ingresos',
      'Supermercado', 'Gastos mensuales', 'Gastos anuales', 'Salidas y diversión'
    )
  ),
  add column subcategory text check (char_length(btrim(subcategory)) between 1 and 70),
  add column detail text check (char_length(btrim(detail)) between 1 and 500);

commit;