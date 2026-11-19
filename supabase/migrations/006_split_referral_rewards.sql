-- New Legacy Barbershop - migration 006
-- Splits referrals into two separate reward systems. Run AFTER 005, in the Supabase SQL Editor.
-- Safe to re-run.
--
--   A. STORE (online purchases)
--      A referred friend's first online order marked "Completed" gives the referrer 1 shop point.
--      5 shop points -> a personal 10%-off shop promo code, valid 30 days.
--
--   B. SERVICE (in-store visits)
--      When a friend signs up with a referral link they automatically get an In-Store Proof Code
--      (e.g. SRV-8X2BK7), valid for 7 days. An admin confirms it in Admin -> Referrals and the
--      referrer gets 1 service point. An expired code can be replaced from the friend's account page.
--      5 service points -> 20% off the next haircut/service, valid 15 days.
--
--   Each referred friend can earn their referrer at most one shop point and one service point,
--   so the same friend can't be used to farm rewards. Signing up alone earns nothing.
--
-- Replaces 005's single referral_points / eligible_for_service_discount. Existing points and
-- rewards are carried over, then the old columns are removed.

-- ============ 1. NEW COLUMNS ============

alter table public.profiles add column if not exists shop_points                 int not null default 0;
alter table public.profiles add column if not exists service_points              int not null default 0;
alter table public.profiles add column if not exists has_service_discount        boolean not null default false;
alter table public.profiles add column if not exists service_discount_expires_at timestamptz;

alter table public.profiles drop constraint if exists profiles_shop_points_check;
alter table public.profiles add  constraint profiles_shop_points_check    check (shop_points >= 0);
alter table public.profiles drop constraint if exists profiles_service_points_check;
alter table public.profiles add  constraint profiles_service_points_check check (service_points >= 0);

-- When each friend earned their referrer a point in each system (null = not yet).
alter table public.referrals add column if not exists shop_point_at    timestamptz;
alter table public.referrals add column if not exists service_point_at timestamptz;

-- In-store proof codes carry their own expiry (7 days after creation).
alter table public.referral_claims add column if not exists expires_at timestamptz;
update public.referral_claims set expires_at = created_at + interval '7 days' where expires_at is null;
alter table public.referral_claims alter column expires_at set not null;

create or replace function public.referral_claims_set_expiry()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.expires_at := new.created_at + interval '7 days';
  return new;
end;
$$;

drop trigger if exists referral_claims_expiry on public.referral_claims;
create trigger referral_claims_expiry
  before insert on public.referral_claims
  for each row execute function public.referral_claims_set_expiry();

create index if not exists referral_claims_active_idx on public.referral_claims (referred_id, expires_at desc)
  where claimed_at is null;

-- ============ 2. CARRY OVER DATA FROM MIGRATION 005 ============

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'referrals' and column_name = 'point_source') then
    update public.referrals set shop_point_at    = point_awarded_at where point_source = 'online'   and shop_point_at is null;
    update public.referrals set service_point_at = point_awarded_at where point_source = 'in_store' and service_point_at is null;
  end if;

  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'profiles' and column_name = 'eligible_for_service_discount') then
    update public.profiles
       set has_service_discount = true,
           service_discount_expires_at = now() + interval '15 days'
     where eligible_for_service_discount and not has_service_discount;
  end if;
end;
$$;

-- Points are always "friends credited, modulo 5" (each reward uses up 5), so this is re-run safe.
update public.profiles p
   set shop_points    = (select count(*) from public.referrals r where r.referrer_id = p.id and r.shop_point_at    is not null) % 5,
       service_points = (select count(*) from public.referrals r where r.referrer_id = p.id and r.service_point_at is not null) % 5;

-- ============ 3. SETTINGS ============

create or replace function public.referral_points_goal()
returns int language sql immutable set search_path = '' as $$ select 5 $$;

create or replace function public.referral_reward_percent()   -- shop reward
returns int language sql immutable set search_path = '' as $$ select 10 $$;

-- ============ 4. SYSTEM A: SHOP POINTS (online purchases) ============
-- Returns null (no point), 'point', or 'reward' (that point completed a reward).

create or replace function public.award_shop_point(p_referred uuid)
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

  insert into public.referrals (referrer_id, referred_id) values (v_referrer, p_referred)
  on conflict (referred_id) do nothing;

  update public.referrals set shop_point_at = now()
   where referred_id = p_referred and shop_point_at is null;
  if not found then
    return null;  -- this friend already earned their shop point
  end if;

  update public.profiles set shop_points = shop_points + 1
   where id = v_referrer
  returning shop_points into v_points;

  if v_points < public.referral_points_goal() then
    return 'point';
  end if;

  loop
    v_code := 'RWD-' || public.generate_code(6);
    exit when not exists (select 1 from public.promo_codes where upper(code) = v_code);
  end loop;

  insert into public.promo_codes (code, discount_percent, expires_at, max_uses, owner_id, source)
  values (v_code, public.referral_reward_percent(), now() + interval '30 days', 1, v_referrer, 'referral')
  returning id into v_promo;

  update public.profiles set shop_points = shop_points - public.referral_points_goal() where id = v_referrer;
  update public.referrals set reward_promo_id = v_promo where referred_id = p_referred;

  return 'reward';
end;
$$;

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
    perform public.award_shop_point(new.customer_id);
  end if;
  return new;
end;
$$;

drop trigger if exists orders_referral_point on public.orders;
create trigger orders_referral_point
  after update of status on public.orders
  for each row execute function public.orders_award_referral_point();

-- ============ 5. SYSTEM B: SERVICE POINTS (in-store visits) ============

create or replace function public.award_service_point(p_referred uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_referrer uuid;
  v_points   int;
begin
  select referred_by into v_referrer from public.profiles where id = p_referred;
  if v_referrer is null or v_referrer = p_referred then
    return null;
  end if;

  insert into public.referrals (referrer_id, referred_id) values (v_referrer, p_referred)
  on conflict (referred_id) do nothing;

  update public.referrals set service_point_at = now()
   where referred_id = p_referred and service_point_at is null;
  if not found then
    return null;  -- this friend's visit was already counted
  end if;

  update public.profiles set service_points = service_points + 1
   where id = v_referrer
  returning service_points into v_points;

  if v_points < public.referral_points_goal() then
    return 'point';
  end if;

  update public.profiles
     set service_points = service_points - public.referral_points_goal(),
         has_service_discount = true,
         service_discount_expires_at = now() + interval '15 days'
   where id = v_referrer;

  return 'reward';
end;
$$;

-- Makes a new SRV- code for a referred friend (internal).
create or replace function public.issue_service_proof_code(p_referred uuid, p_referrer uuid)
returns public.referral_claims
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_row  public.referral_claims;
begin
  loop
    v_code := 'SRV-' || public.generate_code(6);
    exit when not exists (select 1 from public.referral_claims c where c.code = v_code);
  end loop;

  insert into public.referral_claims (code, referred_id, referrer_id)
  values (v_code, p_referred, p_referrer)
  returning * into v_row;
  return v_row;
end;
$$;

-- Customer: returns their current valid code, or a new one if the last one expired.
-- (Keeps its 005 name so the website's existing call still works.)
drop function if exists public.create_referral_proof_code();
create function public.create_referral_proof_code()
returns table (code text, created_at timestamptz, expires_at timestamptz)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_me       uuid := (select auth.uid());
  v_referrer uuid;
  v_row      public.referral_claims;
begin
  if v_me is null then
    raise exception 'NOT_SIGNED_IN' using errcode = 'P0001';
  end if;

  select p.referred_by into v_referrer from public.profiles p where p.id = v_me;
  if v_referrer is null then
    raise exception 'NOT_REFERRED' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.referrals r where r.referred_id = v_me and r.service_point_at is not null) then
    raise exception 'ALREADY_CREDITED' using errcode = 'P0001';
  end if;

  return query
    select c.code, c.created_at, c.expires_at
      from public.referral_claims c
     where c.referred_id = v_me and c.claimed_at is null and c.expires_at > now()
     order by c.created_at desc
     limit 1;
  if found then
    return;
  end if;

  v_row := public.issue_service_proof_code(v_me, v_referrer);
  return query select v_row.code, v_row.created_at, v_row.expires_at;
end;
$$;

-- Admin: confirm an in-store code. status: 'ok' | 'not_found' | 'expired' | 'already_claimed' | 'already_credited'
drop function if exists public.confirm_referral_claim(text);
create function public.confirm_referral_claim(p_code text)
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

  select * into v_claim from public.referral_claims c where c.code = upper(trim(p_code)) for update;
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
  if v_claim.expires_at <= now() then
    return query select 'expired'::text, v_referrer, v_friend, null::int, false;
    return;
  end if;

  v_result := public.award_service_point(v_claim.referred_id);
  if v_result is null then
    return query select 'already_credited'::text, v_referrer, v_friend, null::int, false;
    return;
  end if;

  update public.referral_claims set claimed_at = now(), claimed_by = (select auth.uid()) where id = v_claim.id;
  select p.service_points into v_points from public.profiles p where p.id = v_claim.referrer_id;

  return query select 'ok'::text, v_referrer, v_friend, v_points, (v_result = 'reward');
end;
$$;

-- Admin: mark the 20%-off haircut as used.
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
     set has_service_discount = false, service_discount_expires_at = null
   where id = p_profile and has_service_discount;
  return found;
end;
$$;

-- ============ 6. SIGN-UP: link the friend and give them their In-Store Proof Code ============

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

    perform public.issue_service_proof_code(new.id, referrer);
  end if;

  return new;
end;
$$;

-- Referred customers who signed up before this migration get a code now (if they still need one).
do $$
declare
  r record;
begin
  for r in
    select p.id, p.referred_by
      from public.profiles p
     where p.referred_by is not null
       and not exists (select 1 from public.referrals x where x.referred_id = p.id and x.service_point_at is not null)
       and not exists (select 1 from public.referral_claims c
                        where c.referred_id = p.id and c.claimed_at is null and c.expires_at > now())
  loop
    perform public.issue_service_proof_code(r.id, r.referred_by);
  end loop;
end;
$$;

-- ============ 7. REMOVE 005's COMBINED SYSTEM ============

drop function if exists public.award_referral_point(uuid, text);
alter table public.profiles  drop column if exists referral_points;
alter table public.profiles  drop column if exists eligible_for_service_discount;
alter table public.referrals drop column if exists point_awarded_at;
alter table public.referrals drop column if exists point_source;

-- ============ 8. PERMISSIONS ============

revoke all on function public.award_shop_point(uuid)                      from public, anon, authenticated;
revoke all on function public.award_service_point(uuid)                   from public, anon, authenticated;
revoke all on function public.issue_service_proof_code(uuid, uuid)        from public, anon, authenticated;
revoke all on function public.orders_award_referral_point()               from public, anon, authenticated;
revoke all on function public.referral_claims_set_expiry()                from public, anon, authenticated;
revoke all on function public.handle_new_user()                           from public, anon, authenticated;

revoke all on function public.create_referral_proof_code() from public, anon;
revoke all on function public.confirm_referral_claim(text)  from public, anon;
revoke all on function public.redeem_service_discount(uuid) from public, anon;
grant execute on function public.create_referral_proof_code() to authenticated;
grant execute on function public.confirm_referral_claim(text)  to authenticated;
grant execute on function public.redeem_service_discount(uuid) to authenticated;

notify pgrst, 'reload schema';
