begin;

alter table public.transactions
  drop constraint transactions_category_check,
  add constraint transactions_category_check check (
    category in (
      'Compras', 'Restaurantes', 'Servicios', 'Otros', 'Ingresos',
      'Supermercado', 'Gastos mensuales', 'Gastos anuales',
      'Salidas y diversión', 'Gastos casa'
    )
  );

commit;