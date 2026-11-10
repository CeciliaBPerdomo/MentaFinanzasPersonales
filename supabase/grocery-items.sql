begin;

alter table public.transactions
  add column grocery_items jsonb,
  add constraint grocery_items_array check (
    grocery_items is null or (
      category = 'Supermercado'
      and jsonb_typeof(grocery_items) = 'array'
      and jsonb_array_length(grocery_items) between 1 and 200
    )
  );

commit;