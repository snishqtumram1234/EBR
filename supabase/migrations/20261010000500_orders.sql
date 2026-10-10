-- Orders, payments, refunds, webhooks, coupon redemptions, audit log, reviews.
-- Customers never write any of the order/payment tables directly; they are
-- written only by security-definer functions and service-role server code.

create sequence public.order_number_seq start with 10001;

create table public.orders (
  id                      uuid primary key default gen_random_uuid(),
  order_number            text not null unique default ('ORD-' || nextval('public.order_number_seq')),
  user_id                 uuid not null references public.profiles (id) on delete restrict,
  status                  public.order_status not null default 'pending_payment',
  payment_status          public.payment_status not null default 'pending',
  subtotal_paise          integer not null check (subtotal_paise >= 0),
  discount_paise          integer not null default 0 check (discount_paise >= 0),
  shipping_paise          integer not null default 0 check (shipping_paise >= 0),
  -- GST component already included in total (prices are GST-inclusive).
  tax_paise               integer not null default 0 check (tax_paise >= 0),
  gst_rate_bps            integer not null check (gst_rate_bps between 0 and 10000),
  total_paise             integer not null check (total_paise >= 0),
  refunded_paise          integer not null default 0 check (refunded_paise >= 0),
  coupon_id               uuid references public.coupons (id) on delete restrict,
  coupon_code             text,
  delivery_method_id      uuid not null references public.delivery_methods (id) on delete restrict,
  delivery_method_name    text not null,
  expected_delivery_date  date,
  shipping_address        jsonb not null check (jsonb_typeof(shipping_address) = 'object'),
  -- Fingerprint of the cart the order was created from; used to reuse a recent
  -- pending order instead of creating a duplicate.
  cart_hash               text,
  -- Unpaid orders are cancelled and their stock released after this time.
  expires_at              timestamptz,
  paid_at                 timestamptz,
  cancelled_at            timestamptz,
  cancel_reason           text,
  -- Set when something needs a human, e.g. money captured for a cancelled order.
  needs_review            boolean not null default false,
  review_reason           text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  check (total_paise = subtotal_paise - discount_paise + shipping_paise),
  check (discount_paise <= subtotal_paise),
  check (tax_paise <= total_paise),
  check (refunded_paise <= total_paise)
);

create index orders_user_created_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status);
create index orders_payment_status_idx on public.orders (payment_status);
create index orders_created_at_idx on public.orders (created_at desc);
create index orders_coupon_id_idx on public.orders (coupon_id);
create index orders_delivery_method_id_idx on public.orders (delivery_method_id);
create index orders_pending_expiry_idx on public.orders (expires_at) where status = 'pending_payment';
create index orders_needs_review_idx on public.orders (needs_review) where needs_review;
create index orders_user_cart_hash_idx on public.orders (user_id, cart_hash) where status = 'pending_payment';

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references public.orders (id) on delete cascade,
  product_id        uuid not null references public.products (id) on delete restrict,
  variant_id        uuid references public.product_variants (id) on delete restrict,
  quantity          integer not null check (quantity > 0),
  product_name      text not null,
  product_slug      text not null,
  variant_name      text,
  sku               text,
  image_path        text,
  unit_price_paise  integer not null check (unit_price_paise >= 0),
  line_total_paise  integer not null check (line_total_paise >= 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (line_total_paise = unit_price_paise * quantity)
);

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);
create index order_items_variant_id_idx on public.order_items (variant_id);

create trigger order_items_set_updated_at
  before update on public.order_items
  for each row execute function public.set_updated_at();

create table public.order_status_history (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  from_status  public.order_status,
  status       public.order_status not null,
  note         text check (char_length(note) <= 1000),
  -- null means the system (webhook, expiry job) made the change.
  changed_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index order_status_history_order_idx on public.order_status_history (order_id, created_at);
create index order_status_history_changed_by_idx on public.order_status_history (changed_by);

create trigger order_status_history_set_updated_at
  before update on public.order_status_history
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Payments and refunds
-- ---------------------------------------------------------------------------
create table public.payments (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid not null references public.orders (id) on delete restrict,
  user_id              uuid not null references public.profiles (id) on delete restrict,
  -- 'cashfree' and 'razorpay' are gateways; 'upi' is a direct UPI QR payment
  -- confirmed by the store owner against the bank statement.
  provider             text not null check (provider in ('cashfree', 'razorpay', 'upi')),
  -- Gateway order id (Cashfree order_id / Razorpay order_...) or, for 'upi',
  -- the payment reference shown in the UPI app (FS...).
  provider_order_id    text not null,
  provider_payment_id  text,
  -- UPI only: the 12-digit bank reference (UTR) the customer submits.
  utr                  text check (utr ~ '^[0-9]{12}$'),
  utr_submitted_at     timestamptz,
  amount_paise         integer not null check (amount_paise > 0),
  currency             text not null default 'INR' check (currency = 'INR'),
  status               public.payment_status not null default 'pending',
  method               text,
  failure_reason       text,
  refunded_paise       integer not null default 0 check (refunded_paise >= 0),
  confirmed_by         uuid references public.profiles (id) on delete set null,
  raw_response         jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (provider, provider_order_id),
  check (refunded_paise <= amount_paise)
);

-- A payment id from a gateway is unique per provider; a UTR can back one payment only.
create unique index payments_provider_payment_key on public.payments (provider, provider_payment_id) where provider_payment_id is not null;
create unique index payments_utr_key on public.payments (utr) where utr is not null;
create index payments_confirmed_by_idx on public.payments (confirmed_by);

create index payments_order_id_idx on public.payments (order_id);
create index payments_user_id_idx on public.payments (user_id);
create index payments_status_idx on public.payments (status);

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

create table public.refunds (
  id                  uuid primary key default gen_random_uuid(),
  payment_id          uuid not null references public.payments (id) on delete restrict,
  order_id            uuid not null references public.orders (id) on delete restrict,
  provider_refund_id  text unique,
  amount_paise        integer not null check (amount_paise > 0),
  status              public.refund_status not null default 'pending',
  reason              text check (char_length(reason) <= 500),
  initiated_by        uuid references public.profiles (id) on delete set null,
  raw_response        jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index refunds_payment_id_idx on public.refunds (payment_id);
create index refunds_order_id_idx on public.refunds (order_id);
create index refunds_initiated_by_idx on public.refunds (initiated_by);
create index refunds_status_idx on public.refunds (status);

create trigger refunds_set_updated_at
  before update on public.refunds
  for each row execute function public.set_updated_at();

create table public.webhook_events (
  id            uuid primary key default gen_random_uuid(),
  event_id      text not null unique,
  event_type    text not null,
  payload       jsonb not null,
  processed_at  timestamptz,
  error         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index webhook_events_type_idx on public.webhook_events (event_type, created_at desc);

create trigger webhook_events_set_updated_at
  before update on public.webhook_events
  for each row execute function public.set_updated_at();

create table public.coupon_redemptions (
  id          uuid primary key default gen_random_uuid(),
  coupon_id   uuid not null references public.coupons (id) on delete restrict,
  user_id     uuid not null references public.profiles (id) on delete restrict,
  order_id    uuid not null unique references public.orders (id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index coupon_redemptions_coupon_user_idx on public.coupon_redemptions (coupon_id, user_id);
create index coupon_redemptions_user_id_idx on public.coupon_redemptions (user_id);

create trigger coupon_redemptions_set_updated_at
  before update on public.coupon_redemptions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Admin audit log
-- ---------------------------------------------------------------------------
create table public.admin_audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles (id) on delete set null,
  action      text not null,
  table_name  text not null,
  record_id   text,
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index admin_audit_log_actor_idx on public.admin_audit_log (actor_id, created_at desc);
create index admin_audit_log_record_idx on public.admin_audit_log (table_name, record_id);
create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------
create table public.reviews (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  product_id   uuid not null references public.products (id) on delete cascade,
  rating       smallint not null check (rating between 1 and 5),
  title        text not null check (char_length(title) between 1 and 150),
  body         text not null default '' check (char_length(body) <= 5000),
  -- Public display name, copied from the profile by trigger (profiles are private).
  author_name  text not null default 'Customer',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, product_id)
);

create index reviews_product_created_idx on public.reviews (product_id, created_at desc);

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- True if the caller has a delivered order containing this product.
create or replace function public.can_review_product(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    where o.user_id = (select auth.uid())
      and o.status = 'delivered'
      and oi.product_id = p_product_id
  );
$$;

create or replace function public.reviews_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (new.user_id is distinct from old.user_id or new.product_id is distinct from old.product_id) then
    raise exception 'review owner and product cannot be changed' using errcode = '42501';
  end if;
  select coalesce(nullif(split_part(trim(p.full_name), ' ', 1), ''), 'Customer')
    into new.author_name
    from public.profiles p where p.id = new.user_id;
  new.author_name := coalesce(new.author_name, 'Customer');
  return new;
end;
$$;

create trigger reviews_before_write
  before insert or update on public.reviews
  for each row execute function public.reviews_before_write();

-- Keep products.rating_avg / rating_count in step with reviews.
create or replace function public.refresh_product_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product_id uuid := coalesce(new.product_id, old.product_id);
begin
  update public.products p
     set rating_count = s.cnt,
         rating_avg   = s.avg
    from (
      select count(*)::integer as cnt,
             coalesce(round(avg(rating)::numeric, 2), 0) as avg
      from public.reviews
      where product_id = v_product_id
    ) s
   where p.id = v_product_id;
  return null;
end;
$$;

create trigger reviews_refresh_product_rating
  after insert or update of rating or delete on public.reviews
  for each row execute function public.refresh_product_rating();
