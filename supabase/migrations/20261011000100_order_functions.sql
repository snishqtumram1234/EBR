-- Order lifecycle as single database transactions.
--
-- create_order        customer (own session): prices, stock, address, snapshots
-- Everything below is service_role only; server code calls them after its own
-- auth checks, and the admin ones re-check that the actor really is an admin.
--   submit_upi_payment, mark_order_paid, reject_upi_payment,
--   cancel_order, admin_set_order_status, cancel_expired_orders

alter table public.orders add column stock_released boolean not null default false;

-- Business constants mirrored in lib/config.ts
create or replace function public.gst_rate_bps() returns integer
language sql immutable set search_path = '' as $$ select 1800 $$;

create or replace function public.order_expiry_minutes() returns integer
language sql immutable set search_path = '' as $$ select 30 $$;

create or replace function public.duplicate_order_window_minutes() returns integer
language sql immutable set search_path = '' as $$ select 10 $$;

create or replace function public.fail(p_message text, p_code text) returns void
language plpgsql set search_path = '' as $$
begin
  raise exception '%', p_message using errcode = 'P0001', hint = p_code;
end;
$$;

-- ---------------------------------------------------------------------------
-- Internal helpers
-- ---------------------------------------------------------------------------
create or replace function public.assert_admin(p_actor uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_actor is null or not exists (select 1 from public.profiles where id = p_actor and role = 'admin') then
    perform public.fail('You are not allowed to do this', 'FORBIDDEN');
  end if;
end;
$$;

-- The one place that changes an order's status and writes the timeline row.
-- Legality is enforced by the orders_enforce_transition trigger.
create or replace function public.apply_order_status(
  p_order_id uuid, p_to public.order_status, p_note text, p_actor uuid
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_from public.order_status;
begin
  select status into v_from from public.orders where id = p_order_id for update;
  if not found then
    perform public.fail('Order not found', 'NOT_FOUND');
  end if;
  if v_from = p_to then
    return;
  end if;
  update public.orders set status = p_to where id = p_order_id;
  insert into public.order_status_history (order_id, from_status, status, note, changed_by)
  values (p_order_id, v_from, p_to, p_note, p_actor);
end;
$$;

create or replace function public.release_order_stock(p_order_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_released boolean;
begin
  select stock_released into v_released from public.orders where id = p_order_id for update;
  if v_released is null or v_released then
    return; -- unknown order, or stock already returned: never return it twice
  end if;
  update public.products p
     set stock = p.stock + oi.quantity
    from public.order_items oi
   where oi.order_id = p_order_id and oi.product_id = p.id and oi.variant_id is null;
  update public.product_variants v
     set stock = v.stock + oi.quantity
    from public.order_items oi
   where oi.order_id = p_order_id and oi.variant_id = v.id;
  update public.orders set stock_released = true where id = p_order_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_order: runs as the signed-in customer (auth.uid()); never trusts
-- the client for prices, totals, stock or shipping.
--   p_items:   [{"product": "<slug>", "quantity": 1}]
--   p_address: {"full_name","phone","house","street","city","state","pincode"}
-- ---------------------------------------------------------------------------
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
  delete from pg_temp.order_lines;
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

-- ---------------------------------------------------------------------------
-- UPI: the customer submits the bank reference (UTR). The order is held (no
-- expiry) until the owner confirms or rejects it.
-- ---------------------------------------------------------------------------
create or replace function public.submit_upi_payment(p_reference text, p_user uuid, p_utr text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_pay public.payments%rowtype;
begin
  select * into v_pay from public.payments
   where provider = 'upi' and provider_order_id = p_reference and user_id = p_user for update;
  if not found then
    perform public.fail('Payment not found', 'NOT_FOUND');
  end if;
  if v_pay.status = 'paid' then
    perform public.fail('This payment is already confirmed', 'INVALID_STATE');
  end if;
  if v_pay.utr = p_utr then
    return 'already_submitted';
  end if;
  if v_pay.utr is not null then
    perform public.fail('A reference was already submitted for this order', 'INVALID_STATE');
  end if;
  if not exists (select 1 from public.orders where id = v_pay.order_id and status = 'pending_payment') then
    perform public.fail('This order can no longer accept payment. Please place a new order.', 'INVALID_STATE');
  end if;

  begin
    update public.payments set utr = p_utr, utr_submitted_at = now(), failure_reason = null where id = v_pay.id;
  exception when unique_violation then
    perform public.fail('That reference number has already been used', 'CONFLICT');
  end;

  update public.orders set expires_at = null where id = v_pay.order_id;
  insert into public.order_status_history (order_id, from_status, status, note, changed_by)
  values (v_pay.order_id, 'pending_payment', 'pending_payment', 'Payment reference submitted. Awaiting verification.', p_user);
  return 'submitted';
end;
$$;

-- ---------------------------------------------------------------------------
-- mark_order_paid: the single function behind "this payment is real".
-- Safe to call repeatedly (verify route, webhook, owner confirm).
-- ---------------------------------------------------------------------------
create or replace function public.mark_order_paid(
  p_payment_id uuid, p_provider_payment_id text, p_method text, p_actor uuid, p_raw jsonb default null
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_pay   public.payments%rowtype;
  v_order public.orders%rowtype;
begin
  select * into v_pay from public.payments where id = p_payment_id for update;
  if not found then
    perform public.fail('Payment not found', 'NOT_FOUND');
  end if;
  if v_pay.status = 'paid' then
    return 'already_paid';
  end if;

  select * into v_order from public.orders where id = v_pay.order_id for update;

  update public.payments
     set status = 'paid',
         provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id),
         method = coalesce(p_method, method),
         confirmed_by = p_actor,
         raw_response = coalesce(p_raw, raw_response),
         failure_reason = null
   where id = v_pay.id;

  if v_order.status = 'pending_payment' then
    update public.orders set payment_status = 'paid', paid_at = now(), expires_at = null where id = v_order.id;
    perform public.apply_order_status(v_order.id, 'confirmed', 'Payment received', p_actor);
    update public.products p set sales_count = p.sales_count + oi.quantity
      from public.order_items oi where oi.order_id = v_order.id and oi.product_id = p.id;
    return 'paid';
  end if;

  -- Money arrived for an order that was already cancelled/expired: do not keep
  -- it silently. Flag it so the owner can refund or restore the order.
  update public.orders
     set payment_status = 'paid', paid_at = now(), needs_review = true,
         review_reason = 'Payment received after the order was ' || v_order.status || '. Refund or restore the order.'
   where id = v_order.id;
  return 'needs_review';
end;
$$;

-- Owner could not match the payment: let the customer correct the reference.
create or replace function public.reject_upi_payment(p_payment_id uuid, p_actor uuid, p_reason text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_pay public.payments%rowtype;
begin
  perform public.assert_admin(p_actor);
  select * into v_pay from public.payments where id = p_payment_id and provider = 'upi' for update;
  if not found then
    perform public.fail('Payment not found', 'NOT_FOUND');
  end if;
  if v_pay.status = 'paid' then
    perform public.fail('This payment is already confirmed', 'INVALID_STATE');
  end if;
  update public.payments
     set utr = null, utr_submitted_at = null,
         failure_reason = left(coalesce(nullif(btrim(p_reason), ''), 'Payment could not be matched'), 300)
   where id = v_pay.id;
  update public.orders
     set expires_at = now() + make_interval(mins => public.order_expiry_minutes())
   where id = v_pay.order_id and status = 'pending_payment';
  insert into public.order_status_history (order_id, from_status, status, note, changed_by)
  values (v_pay.order_id, 'pending_payment', 'pending_payment',
          'We could not match your payment: ' || left(coalesce(nullif(btrim(p_reason), ''), 'please check the reference and try again'), 300), p_actor);
  insert into public.admin_audit_log (actor_id, action, table_name, record_id, before, after)
  values (p_actor, 'payment.reject', 'payments', v_pay.id::text,
          jsonb_build_object('utr', v_pay.utr), jsonb_build_object('reason', p_reason));
end;
$$;

-- ---------------------------------------------------------------------------
-- cancel_order: customer, owner or expiry job. Returns stock exactly once.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_order(p_order_id uuid, p_reason text, p_actor uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    perform public.fail('Order not found', 'NOT_FOUND');
  end if;
  if v_order.status = 'cancelled' then
    return;
  end if;
  if v_order.status not in ('pending_payment', 'confirmed', 'processing', 'packed') then
    perform public.fail('This order has already shipped and can no longer be cancelled', 'INVALID_STATE');
  end if;

  perform public.apply_order_status(p_order_id, 'cancelled', coalesce(nullif(btrim(p_reason), ''), 'Order cancelled'), p_actor);
  update public.orders
     set cancelled_at = now(), cancel_reason = left(p_reason, 300), expires_at = null,
         needs_review = needs_review or v_order.payment_status = 'paid',
         review_reason = case when v_order.payment_status = 'paid'
                              then 'Cancelled after payment. Refund the customer.' else review_reason end
   where id = p_order_id;
  perform public.release_order_stock(p_order_id);
  update public.payments set status = 'failed', failure_reason = coalesce(failure_reason, 'Order cancelled')
   where order_id = p_order_id and status = 'pending';
end;
$$;

-- ---------------------------------------------------------------------------
-- Owner moves an order along its timeline (legal moves only).
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_order_status(
  p_order_id uuid, p_to public.order_status, p_note text, p_actor uuid
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_from public.order_status;
begin
  perform public.assert_admin(p_actor);
  select status into v_from from public.orders where id = p_order_id;
  if not found then
    perform public.fail('Order not found', 'NOT_FOUND');
  end if;
  if p_to = 'confirmed' then
    perform public.fail('Confirm the payment to confirm the order', 'INVALID_STATE');
  end if;
  if p_to = 'cancelled' then
    perform public.cancel_order(p_order_id, coalesce(nullif(btrim(p_note), ''), 'Cancelled by the store'), p_actor);
  else
    perform public.apply_order_status(p_order_id, p_to, nullif(btrim(p_note), ''), p_actor);
  end if;
  insert into public.admin_audit_log (actor_id, action, table_name, record_id, before, after)
  values (p_actor, 'order.status', 'orders', p_order_id::text,
          jsonb_build_object('status', v_from), jsonb_build_object('status', p_to, 'note', p_note));
end;
$$;

-- Owner confirms a UPI payment after matching the UTR in the bank statement.
create or replace function public.admin_confirm_payment(p_payment_id uuid, p_actor uuid)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_result text;
  v_pay public.payments%rowtype;
begin
  perform public.assert_admin(p_actor);
  select * into v_pay from public.payments where id = p_payment_id;
  if not found then
    perform public.fail('Payment not found', 'NOT_FOUND');
  end if;
  if v_pay.provider = 'upi' and v_pay.utr is null then
    perform public.fail('The customer has not submitted a payment reference yet', 'INVALID_STATE');
  end if;
  v_result := public.mark_order_paid(p_payment_id, v_pay.utr, 'upi', p_actor, null);
  insert into public.admin_audit_log (actor_id, action, table_name, record_id, before, after)
  values (p_actor, 'payment.confirm', 'payments', p_payment_id::text,
          jsonb_build_object('status', v_pay.status), jsonb_build_object('result', v_result, 'utr', v_pay.utr));
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Expiry: unpaid orders hold stock for 30 minutes, then it is returned.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_expired_orders() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_count integer := 0;
begin
  for v_id in
    select id from public.orders
     where status = 'pending_payment' and expires_at is not null and expires_at < now()
     for update skip locked
  loop
    perform public.cancel_order(v_id, 'Payment was not completed in time', null);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges: only create_order is callable by customers.
-- ---------------------------------------------------------------------------
revoke all on function public.fail(text, text) from public, anon, authenticated;
revoke all on function public.assert_admin(uuid) from public, anon, authenticated;
revoke all on function public.apply_order_status(uuid, public.order_status, text, uuid) from public, anon, authenticated;
revoke all on function public.release_order_stock(uuid) from public, anon, authenticated;
revoke all on function public.create_order(jsonb, text, jsonb) from public, anon;
revoke all on function public.submit_upi_payment(text, uuid, text) from public, anon, authenticated;
revoke all on function public.mark_order_paid(uuid, text, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.reject_upi_payment(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.cancel_order(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.admin_set_order_status(uuid, public.order_status, text, uuid) from public, anon, authenticated;
revoke all on function public.admin_confirm_payment(uuid, uuid) from public, anon, authenticated;
revoke all on function public.cancel_expired_orders() from public, anon, authenticated;

grant execute on function public.create_order(jsonb, text, jsonb) to authenticated;
grant execute on function public.fail(text, text), public.assert_admin(uuid),
  public.apply_order_status(uuid, public.order_status, text, uuid), public.release_order_stock(uuid),
  public.submit_upi_payment(text, uuid, text), public.mark_order_paid(uuid, text, text, uuid, jsonb),
  public.reject_upi_payment(uuid, uuid, text), public.cancel_order(uuid, text, uuid),
  public.admin_set_order_status(uuid, public.order_status, text, uuid),
  public.admin_confirm_payment(uuid, uuid), public.cancel_expired_orders() to service_role;

-- ---------------------------------------------------------------------------
-- Schedule the expiry job every 5 minutes where pg_cron exists (Supabase).
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    perform cron.schedule('cancel-expired-orders', '*/5 * * * *', 'select public.cancel_expired_orders()');
  end if;
end;
$$;
