-- ============================================================================
-- ATLAS — Row Level Security
-- Run after 0001_schema.sql
-- ============================================================================

-- Helper: current user's role, without recursive RLS lookups
create function current_role()
returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql stable security definer;

create function is_staff()
returns boolean as $$
  select current_role() in ('admin', 'manager', 'owner');
$$ language sql stable security definer;

create function is_manager_or_owner()
returns boolean as $$
  select current_role() in ('manager', 'owner');
$$ language sql stable security definer;

-- ----------------------------------------------------------------------------
-- PROFILES
-- ----------------------------------------------------------------------------
alter table profiles enable row level security;

create policy "Users read own profile" on profiles
  for select using (auth.uid() = id or is_staff());

create policy "Users update own profile" on profiles
  for update using (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- LEAGUES — public read; Owner/Manager write (category styling lock)
-- ----------------------------------------------------------------------------
alter table leagues enable row level security;
alter table category_styles enable row level security;
alter table tags enable row level security;

create policy "Leagues are public" on leagues for select using (true);
create policy "Only manager/owner edit leagues" on leagues
  for all using (is_manager_or_owner()) with check (is_manager_or_owner());

create policy "Category styles are public read" on category_styles for select using (true);
create policy "Only manager/owner edit category styles" on category_styles
  for all using (is_manager_or_owner()) with check (is_manager_or_owner());

create policy "Tags are public" on tags for select using (true);
create policy "Staff manage tags" on tags
  for insert with check (is_staff());
create policy "Staff delete tags" on tags
  for delete using (is_staff());

-- ----------------------------------------------------------------------------
-- PRODUCTS — public read of published items; staff manage; cost_usd and code
-- are still columns on the row, so they are stripped in the public API layer
-- (see lib/supabase/queries.ts publicProductSelect) rather than hidden by RLS,
-- since RLS can't hide individual columns.
-- ----------------------------------------------------------------------------
alter table products enable row level security;
alter table product_tags enable row level security;

create policy "Published products are public" on products
  for select using (status = 'published' or is_staff());

create policy "Staff manage products" on products
  for insert with check (is_staff());
create policy "Staff update products" on products
  for update using (is_staff());
create policy "Manager/owner delete products" on products
  for delete using (is_manager_or_owner());

create policy "Product tags are public" on product_tags for select using (true);
create policy "Staff manage product tags" on product_tags
  for all using (is_staff()) with check (is_staff());

-- ----------------------------------------------------------------------------
-- REVIEWS — anyone can read; signed-in users write their own
-- ----------------------------------------------------------------------------
alter table reviews enable row level security;

create policy "Reviews are public" on reviews for select using (true);
create policy "Signed-in users add reviews" on reviews
  for insert with check (auth.uid() = user_id);
create policy "Staff moderate reviews" on reviews
  for delete using (is_staff());

-- ----------------------------------------------------------------------------
-- WISHLIST — private to the owning user
-- ----------------------------------------------------------------------------
alter table wishlist_items enable row level security;

create policy "Users manage own wishlist" on wishlist_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- ORDERS — customers see their own; staff see everything
-- ----------------------------------------------------------------------------
alter table orders enable row level security;
alter table order_items enable row level security;
alter table return_requests enable row level security;

create policy "Users read own orders" on orders
  for select using (auth.uid() = user_id or is_staff());
create policy "Anyone can place an order" on orders
  for insert with check (true); -- guest checkout allowed; user_id set if signed in
create policy "Staff update orders" on orders
  for update using (is_staff());

create policy "Order items follow parent order" on order_items
  for select using (
    exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_staff()))
  );
create policy "Anyone can insert order items with their order" on order_items
  for insert with check (true);

create policy "Users manage own return requests" on return_requests
  for select using (auth.uid() = user_id or is_staff());
create policy "Users create own return requests" on return_requests
  for insert with check (auth.uid() = user_id);
create policy "Staff update return requests" on return_requests
  for update using (is_staff());

-- ----------------------------------------------------------------------------
-- REFERRALS
-- ----------------------------------------------------------------------------
alter table referral_redemptions enable row level security;

create policy "Users see referrals involving them" on referral_redemptions
  for select using (
    redeemed_by = auth.uid()
    or code in (select referral_code from profiles where id = auth.uid())
    or is_staff()
  );
create policy "System inserts referral redemptions" on referral_redemptions
  for insert with check (true);

-- ----------------------------------------------------------------------------
-- SEARCH LOGS — write-only for everyone, read-only for staff (owner/manager)
-- ----------------------------------------------------------------------------
alter table search_logs enable row level security;

create policy "Anyone can log a search" on search_logs
  for insert with check (true);
create policy "Manager/owner read search logs" on search_logs
  for select using (is_manager_or_owner());
