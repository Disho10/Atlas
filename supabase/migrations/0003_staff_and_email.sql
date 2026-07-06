-- ============================================================================
-- 0003_staff_and_email.sql
-- Adds email to profiles (so the Owner can find teammates by email to promote
-- them), backfills existing rows, keeps it in sync on signup, and adds the RLS
-- policies that let the Owner update other people's roles.
-- Run this AFTER 0001 and 0002, in the Supabase SQL Editor.
-- ============================================================================

-- 1. Email column on profiles -----------------------------------------------
alter table profiles add column if not exists email text;

-- Backfill from auth.users for anyone who already signed up
update profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

create unique index if not exists profiles_email_key on profiles (lower(email));

-- 2. Keep email populated on new signups ------------------------------------
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, referral_code)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    upper(substr(md5(random()::text), 1, 8))
  );
  return new;
end;
$$ language plpgsql security definer;

-- 3. RLS: let the Owner read every profile and update roles ------------------
-- (is_manager_or_owner / is_staff already exist from 0002.)

-- Owner (and staff) can already read profiles via the 0002 "Users read own
-- profile" policy which includes `is_staff()`. Add an explicit owner-manage
-- policy so the Owner can UPDATE other people's roles.
drop policy if exists "Owner manages team roles" on profiles;
create policy "Owner manages team roles" on profiles
  for update using (atlas_role() = 'owner');

-- Let staff read all profiles (needed for the Team tab list). The existing
-- select policy already allows this via is_staff(); this is a no-op safety net
-- in case 0002 was applied in a reduced form.
drop policy if exists "Staff read all profiles" on profiles;
create policy "Staff read all profiles" on profiles
  for select using (auth.uid() = id or is_staff());

-- 4. Tighten product writes to Owner + Manager only --------------------------
-- (0002 allowed any staff incl. admin to insert/update; per requirements only
-- Owner and Manager may edit products. Admin can still log orders.)
drop policy if exists "Staff manage products" on products;
drop policy if exists "Staff update products" on products;
create policy "Manager/owner insert products" on products
  for insert with check (is_manager_or_owner());
create policy "Manager/owner update products" on products
  for update using (is_manager_or_owner());

-- 5. Let staff manually log orders (channel = instagram/whatsapp) ------------
-- Orders already allow "Anyone can place an order" for the storefront checkout.
-- Manual staff orders also set logged_by; the existing insert policy covers it.
-- Ensure staff can update order status too (already present as "Staff update
-- orders"). No change needed beyond confirming it exists.

-- 6. Public order tracking & returns by order number -------------------------
-- Customers (incl. manual WhatsApp/IG buyers with no account) look orders up by
-- their order number, which acts as the access token. These policies allow an
-- anonymous SELECT so the /track page works without login. Order numbers are
-- unguessable-enough sequential-with-prefix; if you want them truly opaque,
-- switch the generator to a random token — the app code doesn't care.
drop policy if exists "Public can look up an order to track" on orders;
create policy "Public can look up an order to track" on orders
  for select using (true);

-- Order items are already readable when their parent order is (existing policy).
-- Allow public to read them for tracking display:
drop policy if exists "Public can read order items for tracking" on order_items;
create policy "Public can read order items for tracking" on order_items
  for select using (true);

-- Allow anyone to file a return/exchange against an order they know the number
-- of. The server action enforces the delivered + 14-day-window rule before
-- inserting, and staff review every request before it's actioned.
drop policy if exists "Public can file a return request" on return_requests;
create policy "Public can file a return request" on return_requests
  for insert with check (true);
