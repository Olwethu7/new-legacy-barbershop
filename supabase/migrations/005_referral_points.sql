-- New Legacy Barbershop - migration 005
-- Referral points, in-store "Referral Proof Codes" (valid 7 days) and point rewards.
-- Also re-applies migration 003 (product columns), which fixes the
-- "The database is missing the new product columns" error on Admin -> Products -> Edit.
--
-- Run the WHOLE file in the Supabase SQL Editor, AFTER 004. Safe to re-run.
--
-- How points work:
--   * A referrer earns 1 point per referred friend, the first time that friend either
--       - has an online order marked "Completed" in Admin -> Orders, or
--       - shows a valid Referral Proof Code in-store and an admin confirms it in Admin -> Referrals.
--     (One point per friend, so the same friend can't earn their referrer endless points.)
--   * Every 5 points: a personal 10%-off shop promo code (valid 30 days) is created for the
--     referrer, and they become eligible for 20% off their next haircut. Points then restart at 0.
--   * Friends no longer earn their referrer anything just by signing up.

-- ============ 1. PRODUCT COLUMNS (same as migration 003) ============

alter table public.products add column if not exists image_urls text[] not null default '{}';
alter table public.products add column if not exists highlights text[] not null default '{}';
alter table public.products add column if not exists specs      jsonb  not null default '[]'::jsonb;

alter table public.products drop constraint if exists products_specs_is_array;
alter table public.products
  add constraint products_specs_is_array check (jsonb_typeof(specs) = 'array');

-- ============ 2. PROFILES: points + haircut reward ============

-- referred_by already exists since migration 004; kept here so this file stands on its own.
alter table public.profiles add column if not exists referred_by uuid references public.profiles (id) on delete set null;
alter table public.profiles add column if not exists referral_points int not null default 0;
alter table public.profiles add column if not exists eligible_for_service_discount boolean not null default false;

alter table public.profiles drop constraint if exists profiles_referral_points_check;
alter table public.profiles add constraint profiles_referral_points_check check (referral_points >= 0);

-- ============ 3. REFERRALS: record when the friend earned their referrer a point ============

alter table public.referrals add column if not exists point_awarded_at timestamptz;
alter table public.referrals add column if not exists point_source text;

alter table public.referrals drop constraint if exists referrals_point_source_check;
alter table public.referrals
  add constraint referrals_point_source_check check (point_source is null or point_source in ('online', 'in_store'));

-- ============ 4. REFERRAL CLAIMS (in-store proof codes) ============

create table if not exists public.referral_claims (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,                                   -- e.g. "REF-8X2BK7"
  referred_id  uuid not null references public.profiles (id) on delete cascade,  -- the friend showing the code
  referrer_id  uuid not null references public.profiles (id) on delete cascade,  -- who gets the point
  created_at   timestamptz not null default now(),                     -- expires 7 days after this
  claimed_at   timestamptz,                                            -- set when an admin confirms it
  claimed_by   uuid references public.profiles (id) on delete set null
);

create index if not exists referral_claims_referred_idx on public.referral_claims (referred_id, created_at desc);
create index if not exists referral_claims_claimed_idx  on public.referral_claims (claimed_at desc) where claimed_at is not null;

-- ============ 5. SETTINGS ============

create or replace function public.referral_points_goal()
returns int language sql immutable set search_path = '' as $$ select 5 $$;

-- 10% shop discount for the reward promo code (also defined in 004).
create or replace function public.referral_reward_percent()
returns int language sql immutable set search_path = '' as $$ select 10 $$;

-- ============ 6. AWARD A POINT (internal) ============
-- Returns null when no point was given (no referrer, or this friend already earned one),
-- 'point' when a point was added, 'reward' when that point completed a reward.

create or replace function public.award_referral_point(p_referred uuid, p_source text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_referrer uuid;
  v_points   int;
  v_code     text;
  v_promo    uuid;
begin
  select referred_by into v_referrer from public.profiles where id = p_referred;
  if v_referrer is null or v_referrer = p_referred then
    return null;
  end if;

  insert into public.referrals (referrer_id, referred_id)
  values (v_referrer, p_referred)
  on conflict (referred_id) do nothing;

  -- Only the first qualifying event per friend counts. The row lock stops double awards.
  update public.referrals
     set point_awarded_at = now(), point_source = p_source
   where referred_id = p_referred and point_awarded_at is null;
  if not found then
    return null;
  end if;

  update public.profiles
     set referral_points = referral_points + 1
   where id = v_referrer
  returning referral_points into v_points;

  if v_points < public.referral_points_goal() then
    return 'point';
  end if;

  -- Reward 1: personal 10%-off shop code, single use, valid 30 days.
  loop
    v_code := 'RWD-' || public.generate_code(6);
    exit when not exists (select 1 from public.promo_codes where upper(code) = v_code);
  end loop;

  insert into public.promo_codes (code, discount_percent, expires_at, max_uses, owner_id, source)
  values (v_code, public.referral_reward_percent(), now() + interval '30 days', 1, v_referrer, 'referral')
  returning id into v_promo;

  -- Reward 2: 20% off the next haircut. Points restart towards the next reward.
  update public.profiles
     set referral_points = referral_points - public.referral_points_goal(),
         eligible_for_service_discount = true
   where id = v_referrer;

  update public.referrals set reward_promo_id = v_promo where referred_id = p_referred;

  return 'reward';
end;
$$;

-- ============ 7. ONLINE PURCHASE: point when an order is marked Completed ============

create or replace function public.orders_award_referral_point()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'completed'
     and old.status is distinct from 'completed'
     and new.customer_id is not null then
    perform public.award_referral_point(new.customer_id, 'online');
  end if;
  return new;
end;
$$;

drop trigger if exists orders_referral_point on public.orders;
create trigger orders_referral_point
  after update of status on public.orders
  for each row execute function public.orders_award_referral_point();

-- ============ 8. CUSTOMER: create (or reuse) a Referral Proof Code ============

create or replace function public.create_referral_proof_code()
returns table (code text, created_at timestamptz)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_me       uuid := (select auth.uid());
  v_referrer uuid;
  v_code     text;
  v_created  timestamptz;
begin
  if v_me is null then
    raise exception 'NOT_SIGNED_IN' using errcode = 'P0001';
  end if;

  select p.referred_by into v_referrer from public.profiles p where p.id = v_me;
  if v_referrer is null then
    raise exception 'NOT_REFERRED' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.referrals r where r.referred_id = v_me and r.point_awarded_at is not null) then
    raise exception 'ALREADY_CREDITED' using errcode = 'P0001';
  end if;

  -- Still have a valid, unused code? Give that one back instead of making another.
  return query
    select c.code, c.created_at
      from public.referral_claims c
     where c.referred_id = v_me
       and c.claimed_at is null
       and c.created_at > now() - interval '7 days'
     order by c.created_at desc
     limit 1;
  if found then
    return;
  end if;

  loop
    v_code := 'REF-' || public.generate_code(6);
    exit when not exists (select 1 from public.referral_claims c where c.code = v_code);
  end loop;

  insert into public.referral_claims as rc (code, referred_id, referrer_id)
  values (v_code, v_me, v_referrer)
  returning rc.created_at into v_created;

  return query select v_code, v_created;
end;
$$;

-- ============ 9. ADMIN: confirm a Referral Proof Code ============
-- status: 'ok' | 'not_found' | 'expired' | 'already_claimed' | 'already_credited'

create or replace function public.confirm_referral_claim(p_code text)
returns table (status text, referrer_name text, friend_name text, points int, rewarded boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_claim    public.referral_claims%rowtype;
  v_result   text;
  v_referrer text;
  v_friend   text;
  v_points   int;
begin
  if not public.is_admin() then
    raise exception 'NOT_ADMIN' using errcode = '42501';
  end if;

  select * into v_claim
    from public.referral_claims c
   where c.code = upper(trim(p_code))
   for update;

  if not found then
    return query select 'not_found'::text, null::text, null::text, null::int, false;
    return;
  end if;

  select coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), p.email)
    into v_referrer from public.profiles p where p.id = v_claim.referrer_id;
  select coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), p.email)
    into v_friend from public.profiles p where p.id = v_claim.referred_id;

  if v_claim.claimed_at is not null then
    return query select 'already_claimed'::text, v_referrer, v_friend, null::int, false;
    return;
  end if;

  if v_claim.created_at <= now() - interval '7 days' then
    return query select 'expired'::text, v_referrer, v_friend, null::int, false;
    return;
  end if;

  v_result := public.award_referral_point(v_claim.referred_id, 'in_store');
  if v_result is null then
    -- This friend already earned their referrer a point (e.g. an online order).
    return query select 'already_credited'::text, v_referrer, v_friend, null::int, false;
    return;
  end if;

  update public.referral_claims
     set claimed_at = now(), claimed_by = (select auth.uid())
   where id = v_claim.id;

  select p.referral_points into v_points from public.profiles p where p.id = v_claim.referrer_id;

  return query select 'ok'::text, v_referrer, v_friend, v_points, (v_result = 'reward');
end;
$$;

-- ============ 10. ADMIN: mark the 20%-off haircut as used ============

create or replace function public.redeem_service_discount(p_profile uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'NOT_ADMIN' using errcode = '42501';
  end if;

  update public.profiles
     set eligible_for_service_discount = false
   where id = p_profile and eligible_for_service_discount;
  return found;
end;
$$;

-- ============ 11. SIGN-UP: link the friend, but no reward until they buy or visit ============

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta     jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  my_code  text;
  ref_code text := upper(nullif(trim(meta ->> 'referral_code'), ''));
  referrer uuid;
begin
  loop
    my_code := public.generate_code(6);
    exit when not exists (select 1 from public.profiles where referral_code = my_code);
  end loop;

  if ref_code is not null then
    select id into referrer from public.profiles where referral_code = ref_code;
  end if;
  if referrer = new.id then
    referrer := null;
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

  if referrer is not null then
    insert into public.referrals (referrer_id, referred_id)
    values (referrer, new.id)
    on conflict (referred_id) do nothing;
  end if;

  return new;
end;
$$;

-- ============ 12. ROW LEVEL SECURITY + PERMISSIONS ============

alter table public.referral_claims enable row level security;

drop policy if exists "Admin all referral_claims" on public.referral_claims;
drop policy if exists "Read own referral_claims"  on public.referral_claims;
create policy "Admin all referral_claims" on public.referral_claims
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Read own referral_claims" on public.referral_claims
  for select to authenticated using (referred_id = (select auth.uid()));

-- Codes are only created/confirmed through the functions above.
revoke insert, update, delete on public.referral_claims from anon, authenticated;
grant select on public.referral_claims to authenticated;
-- Admin policies still need the table privileges for the admin pages' reads.

-- A referred friend can see whether they've already earned their referrer a point.
drop policy if exists "Read referral as friend" on public.referrals;
create policy "Read referral as friend" on public.referrals
  for select to authenticated using (referred_id = (select auth.uid()));

-- Internal helpers: never callable from the website.
revoke all on function public.award_referral_point(uuid, text) from public, anon, authenticated;
revoke all on function public.orders_award_referral_point() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Callable from the website (each checks who is calling).
revoke all on function public.create_referral_proof_code() from public, anon;
revoke all on function public.confirm_referral_claim(text) from public, anon;
revoke all on function public.redeem_service_discount(uuid) from public, anon;
grant execute on function public.create_referral_proof_code() to authenticated;
grant execute on function public.confirm_referral_claim(text) to authenticated;
grant execute on function public.redeem_service_discount(uuid) to authenticated;

-- Make the API see the new columns/tables straight away (fixes the "missing columns" error
-- even if migration 003 had been run but the API cache was stale).
notify pgrst, 'reload schema';
