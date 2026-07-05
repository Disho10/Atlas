-- ============================================================================
-- ATLAS — Seed data (mirrors lib/mockData.ts so the live site looks the same
-- as the prototype on day one) + storage bucket for review photos.
-- Run after 0001_schema.sql and 0002_rls.sql.
-- ============================================================================

insert into leagues (slug, name, country, primary_color, secondary_color, logo_url, logo_has_wordmark, sort_order) values
  ('la-liga', 'LaLiga', 'Spain', '#EE2737', '#0B0D10', '/logos/la-liga.png', true, 1),
  ('premier-league', 'Premier League', 'England', '#3D195B', '#00FF87', '/logos/premier-league.png', false, 2),
  ('serie-a', 'Serie A', 'Italy', '#004B8D', '#FFFFFF', '/logos/serie-a.png', true, 3),
  ('bundesliga', 'Bundesliga', 'Germany', '#D3010C', '#0B0D10', '/logos/bundesliga.png', true, 4),
  ('ligue-1', 'Ligue 1', 'France', '#0D1240', '#DAE41A', '/logos/ligue-1.png', true, 5),
  ('lebanese-league', 'Lebanese Premier League', 'Lebanon', '#C8102E', '#00693E', '/logos/lebanese-league.png', false, 6);

insert into products (name, category, league_slug, team, price_usd, compare_at_usd, gender, sizes, out_of_stock_sizes, stock, coming_soon, hot, status, image_url) values
  ('Real Madrid Home Shirt 25/26', 'shirts', 'la-liga', 'Real Madrid', 89, 110, 'male', '{S,M,L,XL}', '{}', 42, false, true, 'published', 'https://images.unsplash.com/photo-1552667466-07770ae110d0?q=80&w=800&auto=format&fit=crop'),
  ('Barcelona Away Shirt 25/26', 'shirts', 'la-liga', 'Barcelona', 89, null, 'male', '{S,M,L,XL,XXL}', '{}', 30, false, false, 'published', 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=800&auto=format&fit=crop'),
  ('Man City Home Shirt 25/26', 'shirts', 'premier-league', 'Manchester City', 92, null, 'unisex', '{S,M,L}', '{L}', 12, false, true, 'published', 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=800&auto=format&fit=crop'),
  ('Inter Milan Home Shirt 25/26', 'shirts', 'serie-a', 'Inter Milan', 87, null, 'male', '{S,M,L,XL}', '{}', 18, true, false, 'published', 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=800&auto=format&fit=crop'),
  ('Atlas Match Ball Pro', 'balls', null, 'Atlas', 34, null, 'unisex', '{Size 5}', '{}', 60, false, false, 'published', 'https://images.unsplash.com/photo-1614632537190-23e4146777db?q=80&w=800&auto=format&fit=crop'),
  ('Pro Grip Socks - Crimson', 'socks', null, 'Atlas', 14, null, 'unisex', '{S,M,L}', '{}', 5, false, false, 'published', 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?q=80&w=800&auto=format&fit=crop'),
  ('Carbon Shield Shin Pads', 'shinpads', null, 'Atlas', 22, null, 'unisex', '{S,M,L}', '{}', 25, false, false, 'published', 'https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=800&auto=format&fit=crop'),
  ('Women''s Tech Training Hoodie', 'sportswear', null, 'Atlas', 58, null, 'female', '{XS,S,M,L}', '{}', 20, false, true, 'published', 'https://images.unsplash.com/photo-1483721310020-03333e577078?q=80&w=800&auto=format&fit=crop'),
  ('PSG Home Shirt 25/26', 'shirts', 'ligue-1', 'PSG', 90, null, 'male', '{S,M,L,XL}', '{}', 27, false, false, 'published', 'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?q=80&w=800&auto=format&fit=crop'),
  ('Bayern Munich Home Shirt 25/26', 'shirts', 'bundesliga', 'Bayern Munich', 88, null, 'male', '{M,L,XL}', '{}', 33, false, false, 'published', 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?q=80&w=800&auto=format&fit=crop'),
  ('Nejmeh SC Home Shirt', 'shirts', 'lebanese-league', 'Nejmeh SC', 55, null, 'male', '{S,M,L,XL}', '{}', 15, false, false, 'published', 'https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?q=80&w=800&auto=format&fit=crop'),
  ('Men''s Performance Track Jacket', 'sportswear', null, 'Atlas', 64, null, 'male', '{S,M,L,XL}', '{}', 3, false, false, 'published', 'https://images.unsplash.com/photo-1556906781-9a412961c28c?q=80&w=800&auto=format&fit=crop');

insert into tags (label) values
  ('Real Madrid'), ('Spain'), ('Home Kit'), ('La Liga'), ('Barcelona'), ('Away Kit'),
  ('Manchester City'), ('England'), ('Premier League'), ('Match Ball'), ('Training'),
  ('Grip Socks'), ('Protection'), ('Hoodie'), ('PSG'), ('France'), ('Ligue 1'),
  ('Bayern Munich'), ('Germany'), ('Bundesliga'), ('Nejmeh'), ('Lebanon'), ('Lebanese League'),
  ('Track Jacket');

-- Storage bucket for review photos + product images
insert into storage.buckets (id, name, public) values ('review-photos', 'review-photos', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
  on conflict (id) do nothing;

create policy "Public read review photos" on storage.objects
  for select using (bucket_id = 'review-photos');
create policy "Signed-in users upload review photos" on storage.objects
  for insert with check (bucket_id = 'review-photos' and auth.role() = 'authenticated');

create policy "Public read product images" on storage.objects
  for select using (bucket_id = 'product-images');
create policy "Staff upload product images" on storage.objects
  for insert with check (bucket_id = 'product-images' and auth.role() = 'authenticated');

-- ----------------------------------------------------------------------------
-- Make yourself the Owner after you sign up once through the site:
-- update profiles set role = 'owner' where id = '<your-auth-user-id>';
-- (find your user id in Supabase → Authentication → Users)
-- ----------------------------------------------------------------------------
