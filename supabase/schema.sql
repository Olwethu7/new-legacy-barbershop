-- New Legacy Barbershop - database schema
-- Run in the Supabase SQL Editor. Safe to re-run.

create extension if not exists pgcrypto;

-- ============ TABLES ============

create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  price       numeric(10,2) not null check (price >= 0),
  category    text,
  description text,
  image_url   text,
  stock_status text not null default 'in_stock'
               constraint products_stock_status_check
               check (stock_status in ('in_stock', 'low_stock', 'out_of_stock')),
  featured    boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.services (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  price       numeric(10,2) not null check (price >= 0),
  addon_name  text,
  addon_price numeric(10,2) check (addon_price is null or addon_price >= 0),
  created_at  timestamptz not null default now()
);

create table if not exists public.gallery (
  id         uuid primary key default gen_random_uuid(),
  image_url  text not null,
  caption    text,
  width      int check (width  is null or width  > 0),
  height     int check (height is null or height > 0),
  created_at timestamptz not null default now()
);

-- Single-row table: id is locked to 1
create table if not exists public.site_info (
  id       int primary key default 1 check (id = 1),
  name     text not null default 'New Legacy Barbershop',
  tagline  text,
  phone    text,
  whatsapp text,
  email    text,
  hours    jsonb  -- e.g. {"mon_fri": "09:00-18:00", "sat": "08:00-16:00", "sun": "Closed"}
);

insert into public.site_info (id) values (1) on conflict (id) do nothing;

create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone         text not null,
  items         jsonb not null,  -- e.g. [{"product_id": "...", "name": "...", "price": 120, "qty": 2}]
  subtotal      numeric(10,2) not null check (subtotal >= 0),
  status        text not null default 'pending'
                check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at    timestamptz not null default now()
);

-- ============ ROW LEVEL SECURITY ============

alter table public.products  enable row level security;
alter table public.services  enable row level security;
alter table public.gallery   enable row level security;
alter table public.site_info enable row level security;
alter table public.orders    enable row level security;

-- Public read
drop policy if exists "Public read products"  on public.products;
drop policy if exists "Public read services"  on public.services;
drop policy if exists "Public read gallery"   on public.gallery;
drop policy if exists "Public read site_info" on public.site_info;

create policy "Public read products"  on public.products  for select to anon, authenticated using (true);
create policy "Public read services"  on public.services  for select to anon, authenticated using (true);
create policy "Public read gallery"   on public.gallery   for select to anon, authenticated using (true);
create policy "Public read site_info" on public.site_info for select to anon, authenticated using (true);

-- Public can place orders (new orders must start as 'pending')
drop policy if exists "Public insert orders" on public.orders;
create policy "Public insert orders" on public.orders
  for insert to anon, authenticated
  with check (status = 'pending');

-- Admin (any authenticated user) full access
drop policy if exists "Admin all products"  on public.products;
drop policy if exists "Admin all services"  on public.services;
drop policy if exists "Admin all gallery"   on public.gallery;
drop policy if exists "Admin all site_info" on public.site_info;
drop policy if exists "Admin all orders"    on public.orders;

create policy "Admin all products"  on public.products  for all to authenticated using (true) with check (true);
create policy "Admin all services"  on public.services  for all to authenticated using (true) with check (true);
create policy "Admin all gallery"   on public.gallery   for all to authenticated using (true) with check (true);
create policy "Admin all site_info" on public.site_info for all to authenticated using (true) with check (true);
create policy "Admin all orders"    on public.orders    for all to authenticated using (true) with check (true);
