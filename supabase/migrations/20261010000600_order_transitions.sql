-- The single definition of legal order status transitions. Enforced by a
-- trigger on orders, so no writer (including the service role) can bypass it.

create or replace function public.is_valid_order_transition(
  p_from public.order_status,
  p_to   public.order_status
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_from
    when 'pending_payment'  then p_to in ('confirmed', 'cancelled')
    when 'confirmed'        then p_to in ('processing', 'cancelled')
    when 'processing'       then p_to in ('packed', 'cancelled')
    when 'packed'           then p_to in ('shipped', 'cancelled')
    when 'shipped'          then p_to in ('out_for_delivery', 'delivered')
    when 'out_for_delivery' then p_to in ('delivered')
    when 'delivered'        then p_to in ('refunded')
    when 'cancelled'        then p_to in ('refunded')
    when 'refunded'         then false
  end;
$$;

create or replace function public.orders_enforce_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     and not public.is_valid_order_transition(old.status, new.status) then
    raise exception 'illegal order status transition from % to %', old.status, new.status
      using errcode = 'P0001', hint = 'ILLEGAL_TRANSITION';
  end if;
  return new;
end;
$$;

create trigger orders_enforce_transition
  before update of status on public.orders
  for each row execute function public.orders_enforce_transition();
