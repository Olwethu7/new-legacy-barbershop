-- New Legacy Barbershop - migration 004
-- Customer accounts, admin roles, promo codes, referrals, message log, gallery prices.
-- Run in the Supabase SQL Editor AFTER 002 and 003. Safe to re-run.
--
-- IMPORTANT: until now every signed-in user was treated as an admin. This migration
-- introduces a real `role` column and rewrites every admin policy to check it.
-- Run it BEFORE you turn public sign-ups back on, or a new customer could edit your shop.
-- Every account that already exists when this runs is marked as an admin.

create extension if not exists pgcrypto;

-- ============ 1. PROFILES (one per auth.users row) ============

create table if not exists public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  email            text,
  first_name       text,
  last_name        text,
  phone            text,
  role             text not null default 'customer'
                   constraint profiles_role_check check (role in ('customer', 'admin')),
  referral_code    text not null unique,
  referred_by      uuid references public.profiles (id) on delete set null,
  marketing_opt_in boolean not null default true,
  created_at       timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);

-- Short, readable, unambiguous code (no 0/O/1/I), e.g. "K7MX2Q".
create or replace function public.generate_code(len int default 6)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
begin
  for i in 1..len loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;
end;
$$;

-- True when the current visitor is a signed-in admin. Used by every admin policy.
-- SECURITY DEFINER so it can read profiles without tripping the profiles policies (no recursion).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- ============ 2. PROMO CODES ============

create table if not exists public.promo_codes (
  id               uuid primary key default gen_random_uuid(),
  code             text not null,
  discount_percent int  not null constraint promo_codes_discount_check check (discount_percent between 1 and 100),
  expires_at       timestamptz,                                   -- null = never expires
  max_uses         int  constraint promo_codes_max_uses_check check (max_uses is null or max_uses > 0),
  uses             int  not null default 0 check (uses >= 0),
  active           boolean not null default true,
  -- Set for personal codes (e.g. referral rewards): only this customer can redeem it.
  owner_id         uuid references public.profiles (id) on delete cascade,
  source           text not null default 'admin' constraint promo_codes_source_check check (source in ('admin', 'referral')),
  created_at       timestamptz not null default now()
);

-- Codes are case-insensitive: "legacy20" and "LEGACY20" are the same code.
create unique index if not exists promo_codes_code_key on public.promo_codes (upper(code));

-- ============ 3. REFERRALS ============

create table if not exists public.referrals (
  id               uuid primary key default gen_random_uuid(),
  referrer_id      uuid not null references public.profiles (id) on delete cascade,
  referred_id      uuid not null unique references public.profiles (id) on delete cascade,  -- a person can only be referred once
  reward_promo_id  uuid references public.promo_codes (id) on delete set null,
  created_at       timestamptz not null default now(),
  constraint referrals_not_self check (referrer_id <> referred_id)
);

create index if not exists referrals_referrer_idx on public.referrals (referrer_id);

-- ============ 4. MESSAGE LOG (SMS / Email / WhatsApp) ============

create table if not exists public.message_log (
  id                  uuid primary key default gen_random_uuid(),
  batch_id            uuid not null,              -- one "Send" click; shared by every recipient in it
  recipient_id        uuid references public.profiles (id) on delete set null,
  recipient_name      text,
  recipient_contact   text,                        -- email address or phone number used
  channel             text not null constraint message_log_channel_check check (channel in ('sms', 'email', 'whatsapp')),
  template            text,                        -- e.g. 'we_miss_you', 'thank_you', 'announcement', 'custom'
  subject             text,
  body                text not null,
  status              text not null default 'queued'
                      constraint message_log_status_check check (status in ('queued', 'sent', 'failed')),
  provider_message_id text,
  error               text,
  sent_by             uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now()
);

create index if not exists message_log_created_idx on public.message_log (created_at desc);

-- ============ 5. ORDERS: link to customer + promo discount ============

alter table public.orders add column if not exists customer_id uuid references public.profiles (id) on delete set null;
alter table public.orders add column if not exists promo_code  text;
alter table public.orders add column if not exists discount    numeric(10,2) not null default 0 check (discount >= 0);
alter table public.orders add column if not exists total       numeric(10,2);

update public.orders set total = subtotal where total is null;

create index if not exists orders_customer_idx on public.orders (customer_id);

-- ============ 6. GALLERY: price shown on hover ============

alter table public.gallery add column if not exists price numeric(10,2) check (price is null or price >= 0);

-- ============ 7. NEW-USER TRIGGER: profile + referral reward ============

-- Discount the referrer earns when someone signs up with their link.
create or replace function public.referral_reward_percent()
returns int language sql immutable set search_path = '' as $$ select 10 $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta          jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  my_code       text;
  ref_code      text := upper(nullif(trim(meta ->> 'referral_code'), ''));
  referrer      uuid;
  reward_code   text;
  reward_id     uuid;
begin
  -- Unique personal referral code
  loop
    my_code := public.generate_code(6);
    exit when not exists (select 1 from public.profiles where referral_code = my_code);
  end loop;

  if ref_code is not null then
    select id into referrer from public.profiles where referral_code = ref_code;
  end if;

  insert into public.profiles (id, email, first_name, last_name, phone, referral_code, referred_by)
  values (
    new.id,
    new.email,
    nullif(trim(meta ->> 'first_name'), ''),
    nullif(trim(meta ->> 'last_name'), ''),
    nullif(trim(meta ->> 'phone'), ''),
    my_code,
    referrer
  )
  on conflict (id) do nothing;

  -- Reward the referrer with a personal, single-use promo code.
  if referrer is not null and referrer <> new.id then
    loop
      reward_code := 'REF-' || public.generate_code(6);
      exit when not exists (select 1 from public.promo_codes where upper(code) = reward_code);
    end loop;

    insert into public.promo_codes (code, discount_percent, expires_at, max_uses, owner_id, source)
    values (reward_code, public.referral_reward_percent(), now() + interval '90 days', 1, referrer, 'referral')
    returning id into reward_id;

    insert into public.referrals (referrer_id, referred_id, reward_promo_id)
    values (referrer, new.id, reward_id)
    on conflict (referred_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: every account that exists right now becomes an admin profile
-- (before this migration, only admins could have accounts).
insert into public.profiles (id, email, role, referral_code)
select u.id, u.email, 'admin', public.generate_code(8)
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- ============ 8. PROMO VALIDATION + ORDER TRIGGER ============

-- Checks a code for the current visitor without exposing the promo_codes table.
-- Returns one row (code, discount_percent) when valid, no rows otherwise.
create or replace function public.validate_promo_code(p_code text)
returns table (code text, discount_percent int)
language sql
stable
security definer
set search_path = ''
as $$
  select pc.code, pc.discount_percent
  from public.promo_codes pc
  where upper(pc.code) = upper(trim(p_code))
    and pc.active
    and (pc.expires_at is null or pc.expires_at > now())
    and (pc.max_uses is null or pc.uses < pc.max_uses)
    and (pc.owner_id is null or pc.owner_id = (select auth.uid()));
$$;

-- Runs on every new order:
--   * links the order to the signed-in customer (never to someone else)
--   * re-validates the promo code, applies the discount and counts the use, atomically
create or replace function public.prepare_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  promo public.promo_codes%rowtype;
begin
  new.customer_id := (select auth.uid());
  new.discount := 0;
  new.promo_code := upper(nullif(trim(new.promo_code), ''));

  if new.promo_code is not null then
    select * into promo
    from public.promo_codes
    where upper(code) = new.promo_code
    for update;  -- lock so two orders can't both use the last redemption

    if not found
       or not promo.active
       or (promo.expires_at is not null and promo.expires_at <= now())
       or (promo.max_uses is not null and promo.uses >= promo.max_uses)
       or (promo.owner_id is not null and promo.owner_id is distinct from new.customer_id) then
      raise exception 'PROMO_INVALID' using errcode = 'P0001';
    end if;

    new.discount := round(new.subtotal * promo.discount_percent / 100.0, 2);
    update public.promo_codes set uses = uses + 1 where id = promo.id;
  end if;

  new.total := greatest(new.subtotal - new.discount, 0);
  return new;
end;
$$;

drop trigger if exists orders_prepare on public.orders;
create trigger orders_prepare
  before insert on public.orders
  for each row execute function public.prepare_order();

-- ============ 9. ROW LEVEL SECURITY ============

alter table public.profiles    enable row level security;
alter table public.promo_codes enable row level security;
alter table public.referrals   enable row level security;
alter table public.message_log enable row level security;

-- Existing tables: admin access now requires role = 'admin' (was: any signed-in user).
drop policy if exists "Admin all products"  on public.products;
drop policy if exists "Admin all services"  on public.services;
drop policy if exists "Admin all gallery"   on public.gallery;
drop policy if exists "Admin all site_info" on public.site_info;
drop policy if exists "Admin all orders"    on public.orders;

create policy "Admin all products"  on public.products  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin all services"  on public.services  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin all gallery"   on public.gallery   for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin all site_info" on public.site_info for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin all orders"    on public.orders    for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Customers can see their own orders.
drop policy if exists "Customer read own orders" on public.orders;
create policy "Customer read own orders" on public.orders
  for select to authenticated using (customer_id = (select auth.uid()));

-- Profiles: read/update your own; admins read/update everyone.
drop policy if exists "Read own profile"   on public.profiles;
drop policy if exists "Update own profile" on public.profiles;
drop policy if exists "Admin all profiles" on public.profiles;
create policy "Read own profile"   on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "Update own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "Admin all profiles" on public.profiles for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- Customers may only change these columns on their own row (never role or referral code).
revoke update on public.profiles from authenticated;
grant update (first_name, last_name, phone, marketing_opt_in) on public.profiles to authenticated;
revoke insert, delete on public.profiles from anon, authenticated;
-- Admins insert/delete profiles only through Supabase Auth (the trigger) or the dashboard.

-- Promo codes: admins manage; customers see only codes issued to them.
drop policy if exists "Admin all promo_codes" on public.promo_codes;
drop policy if exists "Read own promo_codes"  on public.promo_codes;
create policy "Admin all promo_codes" on public.promo_codes for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Read own promo_codes"  on public.promo_codes for select to authenticated using (owner_id = (select auth.uid()));

-- Referrals: you see the people you referred; admins see all.
drop policy if exists "Admin all referrals" on public.referrals;
drop policy if exists "Read own referrals"  on public.referrals;
create policy "Admin all referrals" on public.referrals for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Read own referrals"  on public.referrals for select to authenticated using (referrer_id = (select auth.uid()));

-- Message log: admins only.
drop policy if exists "Admin all message_log" on public.message_log;
create policy "Admin all message_log" on public.message_log for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Storage: only admins may change files in the media bucket.
drop policy if exists "Admin upload media" on storage.objects;
drop policy if exists "Admin update media" on storage.objects;
drop policy if exists "Admin delete media" on storage.objects;
create policy "Admin upload media" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin());
create policy "Admin update media" on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_admin()) with check (bucket_id = 'media' and public.is_admin());
create policy "Admin delete media" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_admin());

-- Functions callable from the website.
revoke all on function public.validate_promo_code(text) from public;
grant execute on function public.validate_promo_code(text) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.prepare_order() from public, anon, authenticated;
