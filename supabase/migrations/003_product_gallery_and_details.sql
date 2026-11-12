-- New Legacy Barbershop - migration 003
-- Products get extra photos (other angles) and optional extended details for the product page.
--   image_urls  text[]  additional angles, in display order (the main photo stays in image_url)
--   highlights  text[]  "About this item" bullet points
--   specs       jsonb   ordered list of {"label": "...", "value": "..."}, e.g. Outer Material, Sole Material
-- All three default to empty, so existing products keep working untouched.
-- Run in the Supabase SQL Editor. Safe to re-run.

alter table public.products add column if not exists image_urls text[] not null default '{}';
alter table public.products add column if not exists highlights text[] not null default '{}';
alter table public.products add column if not exists specs      jsonb  not null default '[]'::jsonb;

alter table public.products drop constraint if exists products_specs_is_array;
alter table public.products
  add constraint products_specs_is_array check (jsonb_typeof(specs) = 'array');
