-- ============================================================================
-- 0008_frequently_bought_with.sql
-- Real "customers who bought this also bought" data, not a same-league
-- guess. Counts how many distinct orders contained both products, ranked
-- by that count. SECURITY DEFINER because computing this needs to read
-- order history across ALL customers, not just the caller's own orders
-- (which is all normal RLS on orders/order_items allows) — safe because
-- the function only ever returns a product_id + a count, never anything
-- customer-identifying, same pattern as track_order_public() from 0005.
-- ============================================================================

create or replace function frequently_bought_with(p_product_id uuid, p_limit int default 8)
returns table(product_id uuid, co_purchases bigint)
language sql
stable
security definer
as $$
  select oi2.product_id, count(distinct oi1.order_id) as co_purchases
  from order_items oi1
  join order_items oi2 on oi2.order_id = oi1.order_id and oi2.product_id <> oi1.product_id
  join orders o on o.id = oi1.order_id
  where oi1.product_id = p_product_id
    and o.status <> 'cancelled'
    and oi2.product_id is not null
  group by oi2.product_id
  order by co_purchases desc
  limit p_limit;
$$;

grant execute on function frequently_bought_with(uuid, int) to anon, authenticated;
