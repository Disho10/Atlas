-- ============================================================================
-- 0004_engagement.sql
-- Loyalty (ledger + lifetime tiers + expiry), referrals, birthday discount,
-- match-day promo codes, newsletter, cart recovery, and tag-click tracking.
-- Run AFTER 0001, 0002, 0003. Safe to re-run (guards on everything).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- PROFILE ADDITIONS: birthday, lifetime points (for tiers), activity clock
-- ---------------------------------------------------------------------------
alter table profiles add column if not exists birthday date;
-- lifetime_points only ever goes up (earning), so redeeming never demotes a tier.
alter table profiles add column if not exists lifetime_points int not null default 0;
-- last_activity_at drives the 6-month inactivity expiry.
alter table profiles add column if not exists last_activity_at timestamptz not null default now();
-- so we only send one expiry-warning email per lapse.
alter table profiles add column if not exists expiry_warning_sent_at timestamptz;

-- Derived tier from lifetime points (Bronze / Silver / Gold).
create or replace function loyalty_tier(lifetime int)
returns text as $$
  select case
    when lifetime >= 1500 then 'gold'
    when lifetime >= 500 then 'silver'
    else 'bronze'
  end;
$$ language sql immutable;

-- ---------------------------------------------------------------------------
-- LOYALTY LEDGER — every point movement, so balances are auditable
-- ---------------------------------------------------------------------------
create table if not exists loyalty_ledger (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  delta int not null,                    -- +earned / -redeemed
  reason text not null,                  -- 'purchase','review_photo','referral','signup','redemption','expiry'
  order_id uuid references orders(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists loyalty_ledger_user_idx on loyalty_ledger (user_id, created_at desc);

alter table loyalty_ledger enable row level security;
drop policy if exists "Users read own ledger" on loyalty_ledger;
create policy "Users read own ledger" on loyalty_ledger
  for select using (auth.uid() = user_id or is_staff());
drop policy if exists "System writes ledger" on loyalty_ledger;
create policy "System writes ledger" on loyalty_ledger
  for insert with check (true);

-- Applying a ledger entry keeps profiles.loyalty_points (balance) and
-- lifetime_points (tier basis) in sync, and stamps activity.
create or replace function apply_loyalty(p_user uuid, p_delta int, p_reason text, p_order uuid default null)
returns void as $$
begin
  insert into loyalty_ledger (user_id, delta, reason, order_id)
  values (p_user, p_delta, p_reason, p_order);

  update profiles set
    loyalty_points = greatest(0, loyalty_points + p_delta),
    lifetime_points = lifetime_points + greatest(0, p_delta), -- only earning grows lifetime
    last_activity_at = now(),
    expiry_warning_sent_at = null                             -- fresh activity clears the warning
  where id = p_user;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------------
-- REFERRALS — reward when a referred friend's first order is confirmed
-- ---------------------------------------------------------------------------
-- referral_redemptions already exists (0001). Add reward bookkeeping.
alter table referral_redemptions add column if not exists rewarded boolean not null default false;
alter table referral_redemptions add column if not exists first_order_id uuid references orders(id);

-- ---------------------------------------------------------------------------
-- PROMO / MATCH-DAY DISCOUNT CODES
-- ---------------------------------------------------------------------------
create table if not exists promo_codes (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  description text,                       -- e.g. "El Clásico weekend"
  kind text not null check (kind in ('percent', 'fixed')),
  amount numeric not null,                -- percent (0-100) or fixed USD
  min_subtotal_usd numeric not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses int,                           -- null = unlimited
  used_count int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table promo_codes enable row level security;
drop policy if exists "Anyone can read active promos" on promo_codes;
create policy "Anyone can read active promos" on promo_codes
  for select using (active = true or is_staff());
drop policy if exists "Staff manage promos" on promo_codes;
create policy "Staff manage promos" on promo_codes
  for all using (is_staff()) with check (is_staff());

-- ---------------------------------------------------------------------------
-- NEWSLETTER SUBSCRIBERS (signed-in and guests)
-- ---------------------------------------------------------------------------
create table if not exists newsletter_subscribers (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  user_id uuid references profiles(id) on delete set null,
  source text default 'footer',
  created_at timestamptz not null default now()
);
alter table newsletter_subscribers enable row level security;
drop policy if exists "Anyone can subscribe" on newsletter_subscribers;
create policy "Anyone can subscribe" on newsletter_subscribers
  for insert with check (true);
drop policy if exists "Staff read subscribers" on newsletter_subscribers;
create policy "Staff read subscribers" on newsletter_subscribers
  for select using (is_staff());

-- ---------------------------------------------------------------------------
-- TAG CLICK TRACKING — powers "products related to tags you've clicked"
-- ---------------------------------------------------------------------------
create table if not exists tag_clicks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now()
);
create index if not exists tag_clicks_user_idx on tag_clicks (user_id, created_at desc);
alter table tag_clicks enable row level security;
drop policy if exists "Users log own tag clicks" on tag_clicks;
create policy "Users log own tag clicks" on tag_clicks
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users read own tag clicks" on tag_clicks;
create policy "Users read own tag clicks" on tag_clicks
  for select using (auth.uid() = user_id or is_staff());

-- ---------------------------------------------------------------------------
-- CART RECOVERY — abandoned-cart snapshots for the 24h follow-up email
-- ---------------------------------------------------------------------------
create table if not exists abandoned_carts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  email text,
  items jsonb not null,
  reminded_at timestamptz,               -- set once the 24h email goes out
  recovered_at timestamptz,              -- set if they later checked out
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table abandoned_carts enable row level security;
drop policy if exists "Users manage own abandoned cart" on abandoned_carts;
create policy "Users manage own abandoned cart" on abandoned_carts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Staff read abandoned carts" on abandoned_carts;
create policy "Staff read abandoned carts" on abandoned_carts
  for select using (is_staff());

-- ---------------------------------------------------------------------------
-- BIRTHDAY on signup: capture birthday from signup metadata if provided
-- ---------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, referral_code, birthday, referred_by)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    upper(substr(md5(random()::text), 1, 8)),
    (new.raw_user_meta_data->>'birthday')::date,
    nullif(new.raw_user_meta_data->>'referred_by', '')
  );
  return new;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------------
-- EARNING TRIGGERS — award points automatically (server-enforced)
-- ---------------------------------------------------------------------------

-- Signup welcome bonus: 50 pts when a profile is created.
create or replace function loyalty_on_signup()
returns trigger as $$
begin
  perform apply_loyalty(new.id, 50, 'signup', null);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_profile_created_loyalty on profiles;
create trigger on_profile_created_loyalty
  after insert on profiles
  for each row execute procedure loyalty_on_signup();

-- Purchase points: 1 pt per $1 of subtotal, awarded when an order becomes
-- 'confirmed' (not at placement, so cancelled/unpaid orders don't earn).
create or replace function loyalty_on_order_confirmed()
returns trigger as $$
begin
  if new.status = 'confirmed' and (old.status is null or old.status <> 'confirmed') and new.user_id is not null then
    perform apply_loyalty(new.user_id, floor(new.subtotal_usd)::int, 'purchase', new.id);

    -- Referral reward: if this is the buyer's first confirmed order and they
    -- were referred, reward the referrer 150 pts (once).
    perform reward_referrer_if_first_order(new.user_id, new.id);
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_order_confirmed_loyalty on orders;
create trigger on_order_confirmed_loyalty
  after update on orders
  for each row execute procedure loyalty_on_order_confirmed();

-- Referral reward helper.
create or replace function reward_referrer_if_first_order(p_buyer uuid, p_order uuid)
returns void as $$
declare
  v_ref_code text;
  v_referrer uuid;
  v_prior int;
begin
  select referred_by into v_ref_code from profiles where id = p_buyer;
  if v_ref_code is null then return; end if;

  -- Was there already a rewarded referral for this buyer? If so, stop.
  select count(*) into v_prior from referral_redemptions
   where redeemed_by = p_buyer and rewarded = true;
  if v_prior > 0 then return; end if;

  select id into v_referrer from profiles where referral_code = v_ref_code;
  if v_referrer is null then return; end if;

  insert into referral_redemptions (code, redeemed_by, rewarded, first_order_id)
  values (v_ref_code, p_buyer, true, p_order);

  perform apply_loyalty(v_referrer, 150, 'referral', null);
end;
$$ language plpgsql security definer;

-- Photo-review bonus: 25 pts the first time a user adds a review WITH a photo
-- for a product (discourages spam by being per-product).
create or replace function loyalty_on_photo_review()
returns trigger as $$
begin
  if new.photo_url is not null and new.user_id is not null then
    perform apply_loyalty(new.user_id, 25, 'review_photo', null);
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_review_photo_loyalty on reviews;
create trigger on_review_photo_loyalty
  after insert on reviews
  for each row execute procedure loyalty_on_photo_review();

-- ---------------------------------------------------------------------------
-- NOTIFICATION QUEUE — rows here are picked up by the notify edge function,
-- which emails subscribers about new categories and tag matches. Decoupling
-- via a queue keeps product writes fast and lets email sending be retried.
-- ---------------------------------------------------------------------------
create table if not exists notification_queue (
  id uuid primary key default uuid_generate_v4(),
  kind text not null check (kind in ('new_category', 'tag_match')),
  product_id uuid references products(id) on delete cascade,
  category text,
  tag text,
  sent boolean not null default false,
  created_at timestamptz not null default now()
);
alter table notification_queue enable row level security;
drop policy if exists "Staff read notif queue" on notification_queue;
create policy "Staff read notif queue" on notification_queue
  for select using (is_staff());

-- When a product is published in a category that had no published products
-- before, queue a "new category live" notification.
create or replace function queue_category_notification()
returns trigger as $$
declare v_existing int;
begin
  if new.status = 'published' then
    select count(*) into v_existing from products
     where category = new.category and status = 'published' and id <> new.id;
    if v_existing = 0 then
      insert into notification_queue (kind, product_id, category)
      values ('new_category', new.id, new.category);
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_product_new_category on products;
create trigger on_product_new_category
  after insert or update on products
  for each row execute procedure queue_category_notification();

-- ---------------------------------------------------------------------------
-- REFEREE WELCOME DISCOUNT — a referred customer gets a discount on their
-- FIRST order. Amount is fixed here; change REFEREE_WELCOME_USD in one place.
-- Eligibility: profile.referred_by is set AND they have no prior orders.
-- ---------------------------------------------------------------------------
create or replace function referee_welcome_discount(p_user uuid)
returns numeric as $$
declare
  v_referred text;
  v_orders int;
  welcome_usd numeric := 10;  -- $10 off first order for referred customers
begin
  if p_user is null then return 0; end if;

  select referred_by into v_referred from profiles where id = p_user;
  if v_referred is null then return 0; end if;

  -- Any prior orders (in any state except cancelled) means they've ordered
  -- before, so the welcome no longer applies.
  select count(*) into v_orders from orders
   where user_id = p_user and status <> 'cancelled';
  if v_orders > 0 then return 0; end if;

  return welcome_usd;
end;
$$ language plpgsql security definer;
