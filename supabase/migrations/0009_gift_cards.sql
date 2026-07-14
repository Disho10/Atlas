-- ============================================================================
-- 0009_gift_cards.sql
-- Gift cards: purchase (its own simple RPC, since there's no cart/stock
-- involved) and redemption (folded into place_order() itself, so a gift
-- card behaves like a real payment source at checkout — same
-- server-trusted-math principle as everything else place_order() does).
-- ============================================================================

create table if not exists gift_cards (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,                 -- customer-facing redemption code
  initial_balance_usd numeric not null check (initial_balance_usd > 0),
  remaining_balance_usd numeric not null check (remaining_balance_usd >= 0),
  purchaser_user_id uuid references profiles(id),
  purchaser_email text not null,
  recipient_email text not null,
  recipient_name text,
  message text,
  status text not null default 'active' check (status in ('active', 'redeemed', 'expired', 'cancelled')),
  order_id uuid references orders(id),       -- the order that purchased this card, if any
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists gift_cards_code_idx on gift_cards (code);

-- Audit trail of partial/full redemptions — mirrors the loyalty_ledger
-- pattern (0004) rather than just mutating remaining_balance_usd blind.
create table if not exists gift_card_redemptions (
  id uuid primary key default uuid_generate_v4(),
  gift_card_id uuid not null references gift_cards(id),
  order_id uuid references orders(id),
  amount_usd numeric not null check (amount_usd > 0),
  created_at timestamptz not null default now()
);

alter table gift_cards enable row level security;
alter table gift_card_redemptions enable row level security;

-- No direct client access to either table — everything goes through the
-- SECURITY DEFINER functions below, same reasoning as promo_codes/orders:
-- a gift card's balance is a financial fact, not something a client
-- request should ever set or read directly. Staff get read access for the
-- admin Gift Cards tab.
drop policy if exists "Staff read gift cards" on gift_cards;
create policy "Staff read gift cards" on gift_cards for select using (is_staff());
drop policy if exists "Staff read gift card redemptions" on gift_card_redemptions;
create policy "Staff read gift card redemptions" on gift_card_redemptions for select using (is_staff());

-- ----------------------------------------------------------------------------
-- Purchase — its own function rather than reusing place_order(), since a
-- gift card purchase has no cart items, no stock, and no shipping. Reuses
-- the same rate-limiter (0006) keyed the same way, so this can't be
-- spammed any more than placing a real order can.
-- ----------------------------------------------------------------------------
create or replace function purchase_gift_card(
  p_user_id uuid,
  p_purchaser_email text,
  p_recipient_email text,
  p_recipient_name text,
  p_message text,
  p_amount_usd numeric,
  p_payment_method payment_method
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_code text;
  v_gift_card_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_rl_key text;
begin
  if p_amount_usd is null or p_amount_usd < 10 or p_amount_usd > 500 then
    raise exception 'Gift card amount must be between $10 and $500.';
  end if;
  if p_recipient_email is null or p_recipient_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter a valid recipient email.';
  end if;

  v_rl_key := coalesce(p_user_id::text, nullif(lower(trim(p_purchaser_email)), ''), 'anon');
  if not check_rate_limit('purchase_gift_card', v_rl_key, 5, 900) then
    raise exception 'Too many gift card purchases from this account recently. Please wait a few minutes.';
  end if;

  -- Generate a unique, human-typeable code: ATLAS-XXXX-XXXX
  loop
    v_code := 'ATLAS-' || upper(substr(md5(random()::text), 1, 4)) || '-' || upper(substr(md5(random()::text), 1, 4));
    exit when not exists (select 1 from gift_cards where code = v_code);
  end loop;

  -- The "order" here is a record-keeping order (subtotal = the card's face
  -- value) so gift card purchases show up in revenue/finance reporting
  -- exactly like any other order, rather than being an invisible side
  -- channel. cod is deliberately not offered for this at the app layer —
  -- there's nothing to hand a courier — but the DB doesn't need to know that.
  insert into orders (user_id, status, channel, payment_method, customer_name, customer_email, address, subtotal_usd)
  values (p_user_id, 'placed', 'website', p_payment_method, p_purchaser_email, p_purchaser_email, 'Digital gift card — no shipping', p_amount_usd)
  returning id, order_number into v_order_id, v_order_number;

  insert into gift_cards (code, initial_balance_usd, remaining_balance_usd, purchaser_user_id, purchaser_email, recipient_email, recipient_name, message, order_id)
  values (v_code, p_amount_usd, p_amount_usd, p_user_id, p_purchaser_email, p_recipient_email, nullif(p_recipient_name, ''), nullif(p_message, ''), v_order_id)
  returning id into v_gift_card_id;

  return jsonb_build_object('gift_card_id', v_gift_card_id, 'code', v_code, 'order_number', v_order_number);
end;
$$;

grant execute on function purchase_gift_card(uuid, text, text, text, text, numeric, payment_method) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Redemption — folded into place_order() itself (re-defined here, same
-- signature plus one new optional parameter) so a gift card is applied
-- with the same server-trusted-math discipline as everything else in this
-- function: the code is looked up and validated here, never trusted from
-- the client beyond "here's the code the customer typed."
-- ----------------------------------------------------------------------------
-- CREATE OR REPLACE only replaces a function with the exact same parameter
-- signature — adding p_gift_card_code here means the old 9-parameter
-- place_order() would otherwise stick around as a second overload instead
-- of being replaced, which is exactly the kind of thing that causes
-- "which one did PostgREST actually call" confusion later. Drop it
-- explicitly first so there's only ever one place_order() in existence.
drop function if exists place_order(uuid, text, text, text, text, text, payment_method, text, jsonb);

create or replace function place_order(
  p_user_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_address text,
  p_city text,
  p_payment_method payment_method,
  p_promo_code text,
  p_items jsonb,
  p_gift_card_code text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_item jsonb;
  v_product products%rowtype;
  v_unit_price numeric;
  v_qty int;
  v_variant_label text;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_welcome numeric := 0;
  v_promo promo_codes%rowtype;
  v_status order_status;
  v_order_id uuid;
  v_order_number text;
  v_rl_key text;
  v_updated int;
  v_gift_card gift_cards%rowtype;
  v_gift_card_applied numeric := 0;
  v_total_after_discounts numeric;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty.';
  end if;

  v_rl_key := coalesce(
    p_user_id::text,
    nullif(regexp_replace(coalesce(p_customer_phone, ''), '\D', '', 'g'), ''),
    nullif(lower(trim(coalesce(p_customer_email, ''))), ''),
    lower(trim(coalesce(p_customer_name, ''))) || '|' || lower(trim(coalesce(p_address, '')))
  );
  if not check_rate_limit('place_order', v_rl_key, 5, 900) then
    raise exception 'Too many orders placed recently from this account/number. Please wait a few minutes, or reach out on WhatsApp if this is urgent.';
  end if;

  -- Pass 1: price from the products table (never the client) AND decrement
  -- stock atomically.
  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from products
      where id = (v_item->>'product_id')::uuid and status = 'published'
      for update;
    if not found then
      raise exception 'One of the items in your cart is no longer available.';
    end if;

    v_qty := greatest(1, coalesce((v_item->>'qty')::int, 1));
    v_unit_price := v_product.price_usd;
    v_variant_label := v_item->>'variant_label';

    if v_variant_label is not null and v_variant_label <> '' then
      select (elem->>'price')::numeric into v_unit_price
      from jsonb_array_elements(coalesce(v_product.variants, '[]'::jsonb)) elem
      where elem->>'label' = v_variant_label
      limit 1;
      v_unit_price := coalesce(v_unit_price, v_product.price_usd);
    end if;

    update products set stock = stock - v_qty
      where id = v_product.id and stock >= v_qty;
    get diagnostics v_updated = row_count;
    if v_updated = 0 then
      raise exception 'Not enough stock left for %. Only % available — lower the quantity and try again.', v_product.name, v_product.stock;
    end if;

    v_subtotal := v_subtotal + v_unit_price * v_qty;
  end loop;

  -- Promo code
  if p_promo_code is not null and trim(p_promo_code) <> '' then
    select * into v_promo from promo_codes
      where code = upper(trim(p_promo_code)) and active = true;
    if found
       and (v_promo.starts_at is null or v_promo.starts_at <= now())
       and (v_promo.ends_at is null or v_promo.ends_at >= now())
       and (v_promo.max_uses is null or v_promo.used_count < v_promo.max_uses)
       and v_subtotal >= v_promo.min_subtotal_usd
    then
      v_discount := case when v_promo.kind = 'percent'
        then v_subtotal * v_promo.amount / 100
        else v_promo.amount end;
      v_discount := least(v_discount, v_subtotal);
      update promo_codes set used_count = used_count + 1 where id = v_promo.id;
    end if;
  end if;

  if p_user_id is not null then
    v_welcome := referee_welcome_discount(p_user_id);
  end if;

  v_total_after_discounts := greatest(0, v_subtotal - v_discount - v_welcome);

  -- Gift card — applied last, against whatever's left after promo/welcome
  -- discounts. Locks the row (for update) so two concurrent orders can't
  -- both spend the same balance.
  if p_gift_card_code is not null and trim(p_gift_card_code) <> '' then
    select * into v_gift_card from gift_cards
      where code = upper(trim(p_gift_card_code)) and status = 'active'
      for update;
    if not found then
      raise exception 'That gift card code isn''t valid or has already been used up.';
    end if;
    if v_gift_card.expires_at is not null and v_gift_card.expires_at < now() then
      raise exception 'That gift card has expired.';
    end if;
    v_gift_card_applied := least(v_gift_card.remaining_balance_usd, v_total_after_discounts);
  end if;

  v_status := case when p_payment_method = 'cod' then 'confirmed' else 'placed' end;
  -- Fully covered by a gift card with nothing left to pay? Confirm
  -- immediately regardless of the chosen method — there's no outstanding
  -- payment left to collect.
  if v_gift_card_applied > 0 and v_total_after_discounts - v_gift_card_applied <= 0 then
    v_status := 'confirmed';
  end if;

  insert into orders (
    user_id, status, channel, payment_method, customer_name, customer_phone,
    customer_email, address, city, subtotal_usd
  ) values (
    p_user_id, v_status, 'website', p_payment_method,
    nullif(trim(p_customer_name), ''), nullif(trim(p_customer_phone), ''),
    nullif(trim(p_customer_email), ''), nullif(trim(p_address), ''), nullif(trim(p_city), ''),
    greatest(0, v_total_after_discounts - v_gift_card_applied)
  )
  returning id, order_number into v_order_id, v_order_number;

  if v_gift_card_applied > 0 then
    update gift_cards set
      remaining_balance_usd = remaining_balance_usd - v_gift_card_applied,
      status = case when remaining_balance_usd - v_gift_card_applied <= 0 then 'redeemed' else status end
    where id = v_gift_card.id;
    insert into gift_card_redemptions (gift_card_id, order_id, amount_usd) values (v_gift_card.id, v_order_id, v_gift_card_applied);
  end if;

  -- Pass 2: insert items using the same server-trusted prices.
  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from products where id = (v_item->>'product_id')::uuid;
    v_qty := greatest(1, coalesce((v_item->>'qty')::int, 1));
    v_unit_price := v_product.price_usd;
    v_variant_label := v_item->>'variant_label';

    if v_variant_label is not null and v_variant_label <> '' then
      select (elem->>'price')::numeric into v_unit_price
      from jsonb_array_elements(coalesce(v_product.variants, '[]'::jsonb)) elem
      where elem->>'label' = v_variant_label
      limit 1;
      v_unit_price := coalesce(v_unit_price, v_product.price_usd);
    end if;

    insert into order_items (order_id, product_id, product_name, size, qty, unit_price_usd)
    values (
      v_order_id,
      v_product.id,
      case when v_variant_label is not null and v_variant_label <> ''
        then v_product.name || ' (' || v_variant_label || ')'
        else v_product.name end,
      nullif(v_item->>'size', ''),
      v_qty,
      v_unit_price
    );
  end loop;

  if p_user_id is not null then
    perform reward_referrer_if_first_order(p_user_id, v_order_id);
  end if;

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'gift_card_applied_usd', v_gift_card_applied
  );
end;
$$;

grant execute on function place_order(uuid, text, text, text, text, text, payment_method, text, jsonb, text) to anon, authenticated;
