-- Supabase runs PostgREST requests with pg_safeupdate, which rejects any
-- DELETE or UPDATE without a WHERE clause. create_order cleared its scratch
-- table with a bare DELETE, so it failed on the hosted database. Same function,
-- one line fixed. (Grants are unchanged by CREATE OR REPLACE.)

create or replace function public.create_order(
  p_items jsonb, p_delivery_method text, p_address jsonb
) returns table (order_id uuid, order_number text, total_paise integer, reused boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_user     uuid := auth.uid();
  v_row      record;
  v_prod     public.products%rowtype;
  v_dm       public.delivery_methods%rowtype;
  v_pin      public.serviceable_pincodes%rowtype;
  v_pincode  text := btrim(p_address ->> 'pincode');
  v_subtotal integer := 0;
  v_total    integer;
  v_unit     integer;
  v_days     integer;
  v_hash     text;
  v_order    public.orders%rowtype;
  v_existing public.orders%rowtype;
begin
  if v_user is null then
    perform public.fail('Please log in to place an order', 'UNAUTHENTICATED');
  end if;

  -- ---- input shape ----
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 20 then
    perform public.fail('Your bag is empty', 'VALIDATION_ERROR');
  end if;
  if jsonb_typeof(p_address) is distinct from 'object'
     or coalesce(btrim(p_address ->> 'full_name'), '') = ''
     or coalesce(btrim(p_address ->> 'house'), '') = ''
     or coalesce(btrim(p_address ->> 'street'), '') = ''
     or coalesce(btrim(p_address ->> 'city'), '') = ''
     or coalesce(btrim(p_address ->> 'state'), '') = ''
     or coalesce(p_address ->> 'phone', '') !~ '^[6-9][0-9]{9}$'
     or coalesce(v_pincode, '') !~ '^[1-9][0-9]{5}$' then
    perform public.fail('Please check your delivery address', 'VALIDATION_ERROR');
  end if;

  -- ---- delivery ----
  select * into v_dm from public.delivery_methods where code = p_delivery_method and is_active;
  if not found then
    perform public.fail('Choose a delivery option', 'VALIDATION_ERROR');
  end if;
  select * into v_pin from public.serviceable_pincodes where pincode = v_pincode and is_active;
  if not found then
    perform public.fail('Sorry, we do not deliver to ' || v_pincode || ' yet', 'NOT_SERVICEABLE');
  end if;
  if v_dm.is_express and not v_pin.express_available then
    perform public.fail('Express delivery is not available for ' || v_pincode || '. Choose Standard.', 'NOT_SERVICEABLE');
  end if;
  v_days := case when v_dm.is_express then coalesce(v_pin.express_days, v_dm.max_days) else v_pin.standard_days end;

  -- ---- merge duplicate lines, validate quantities ----
  create temp table if not exists pg_temp.order_lines (slug text primary key, qty integer not null) on commit drop;
  delete from pg_temp.order_lines where true;
  for v_row in
    select (e ->> 'product') as slug, sum((e ->> 'quantity')::integer)::integer as qty
      from jsonb_array_elements(p_items) e
     group by 1
  loop
    if v_row.slug is null or v_row.qty is null or v_row.qty < 1 or v_row.qty > 10 then
      perform public.fail('Quantity must be between 1 and 10 for each item', 'VALIDATION_ERROR');
    end if;
    insert into pg_temp.order_lines values (v_row.slug, v_row.qty);
  end loop;

  select md5(
           (select string_agg(slug || ':' || qty, ',' order by slug) from pg_temp.order_lines)
           || '|' || v_dm.code || '|' || v_pincode || '|' || btrim(p_address ->> 'house') || '|' || btrim(p_address ->> 'street')
         )
    into v_hash;

  -- ---- reuse a recent unpaid identical order instead of creating a duplicate ----
  select * into v_existing
    from public.orders o
   where o.user_id = v_user and o.status = 'pending_payment' and o.cart_hash = v_hash
     and o.created_at > now() - make_interval(mins => public.duplicate_order_window_minutes())
     and (o.expires_at is null or o.expires_at > now())
   order by o.created_at desc
   limit 1;
  if found then
    order_id := v_existing.id; order_number := v_existing.order_number;
    total_paise := v_existing.total_paise; reused := true;
    return next;
    return;
  end if;

  -- ---- lock products (in slug order so two buyers cannot deadlock) and check stock ----
  for v_row in select * from pg_temp.order_lines order by slug loop
    select * into v_prod from public.products where slug = v_row.slug and is_active for update;
    if not found then
      perform public.fail('An item in your bag is no longer available', 'NOT_FOUND');
    end if;
    if v_prod.has_variants then
      perform public.fail('Choose a colour for ' || v_prod.name, 'VALIDATION_ERROR');
    end if;
    if v_prod.stock < v_row.qty then
      perform public.fail(
        case when v_prod.stock <= 0 then v_prod.name || ' is out of stock'
             else 'Only ' || v_prod.stock || ' left of ' || v_prod.name end,
        'OUT_OF_STOCK');
    end if;
    v_subtotal := v_subtotal + v_prod.effective_price_paise * v_row.qty;
  end loop;

  v_total := v_subtotal + v_dm.price_paise;

  insert into public.orders (
    user_id, subtotal_paise, discount_paise, shipping_paise, tax_paise, gst_rate_bps, total_paise,
    delivery_method_id, delivery_method_name, expected_delivery_date, shipping_address,
    cart_hash, expires_at
  ) values (
    v_user, v_subtotal, 0, v_dm.price_paise,
    round(v_total::numeric * public.gst_rate_bps() / (10000 + public.gst_rate_bps()))::integer,
    public.gst_rate_bps(), v_total,
    v_dm.id, v_dm.name, current_date + v_days,
    jsonb_build_object(
      'full_name', btrim(p_address ->> 'full_name'), 'phone', p_address ->> 'phone',
      'house', btrim(p_address ->> 'house'), 'street', btrim(p_address ->> 'street'),
      'city', btrim(p_address ->> 'city'), 'state', btrim(p_address ->> 'state'), 'pincode', v_pincode),
    v_hash, now() + make_interval(mins => public.order_expiry_minutes())
  ) returning * into v_order;

  for v_row in select * from pg_temp.order_lines order by slug loop
    select * into v_prod from public.products where slug = v_row.slug;
    v_unit := v_prod.effective_price_paise;
    insert into public.order_items (
      order_id, product_id, quantity, product_name, product_slug, sku, unit_price_paise, line_total_paise
    ) values (
      v_order.id, v_prod.id, v_row.qty, v_prod.name, v_prod.slug, v_prod.sku, v_unit, v_unit * v_row.qty
    );
    update public.products set stock = stock - v_row.qty where id = v_prod.id;
  end loop;

  insert into public.order_status_history (order_id, from_status, status, note, changed_by)
  values (v_order.id, null, 'pending_payment', 'Order placed', v_user);

  order_id := v_order.id; order_number := v_order.order_number;
  total_paise := v_order.total_paise; reused := false;
  return next;
end;
$$;
