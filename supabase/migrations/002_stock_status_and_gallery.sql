-- New Legacy Barbershop - migration 002
-- 1. products.in_stock (yes/no)  ->  products.stock_status ('in_stock' | 'low_stock' | 'out_of_stock')
-- 2. gallery gets width/height so the public masonry grid can lay out uploaded photos without jumping
-- Run in the Supabase SQL Editor. Safe to re-run.

-- 1. Stock status ------------------------------------------------------------

alter table public.products
  add column if not exists stock_status text not null default 'in_stock';

alter table public.products drop constraint if exists products_stock_status_check;
alter table public.products
  add constraint products_stock_status_check
  check (stock_status in ('in_stock', 'low_stock', 'out_of_stock'));

-- Carry over existing yes/no values, then remove the old column.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'in_stock'
  ) then
    update public.products
      set stock_status = case when in_stock then 'in_stock' else 'out_of_stock' end;
    alter table public.products drop column in_stock;
  end if;
end $$;

-- 2. Gallery image dimensions -----------------------------------------------

alter table public.gallery add column if not exists width  int check (width  is null or width  > 0);
alter table public.gallery add column if not exists height int check (height is null or height > 0);
alter table public.gallery add column if not exists created_at timestamptz not null default now();
