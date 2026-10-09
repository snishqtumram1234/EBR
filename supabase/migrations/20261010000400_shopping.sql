-- Shopping: cart, coupons, delivery, newsletter.

create table public.cart_items (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  product_id               uuid not null references public.products (id) on delete cascade,
  variant_id               uuid,
  quantity                 integer not null check (quantity between 1 and 10),
  -- Unit price when the line was first added; set by trigger, never by the client.
  -- Used only to flag "price changed since you added this".
  unit_price_at_add_paise  integer not null default 0,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint cart_items_unique_line unique nulls not distinct (user_id, product_id, variant_id),
  foreign key (variant_id, product_id) references public.product_variants (id, product_id) on delete cascade
);

create index cart_items_product_id_idx on public.cart_items (product_id);
create index cart_items_variant_id_idx on public.cart_items (variant_id);

create trigger cart_items_set_updated_at
  before update on public.cart_items
  for each row execute function public.set_updated_at();

-- Current unit price for a product/variant per the pricing rule:
-- variant override, else discount price, else list price.
create or replace function public.current_unit_price(p_product_id uuid, p_variant_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(v.price_override_paise, p.discount_price_paise, p.price_paise)
  from public.products p
  left join public.product_variants v on v.id = p_variant_id and v.product_id = p.id
  where p.id = p_product_id;
$$;

create or replace function public.cart_items_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product public.products%rowtype;
begin
  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id
       or new.product_id is distinct from old.product_id
       or new.variant_id is distinct from old.variant_id then
      raise exception 'cart line identity cannot be changed' using errcode = '42501';
    end if;
    new.unit_price_at_add_paise := old.unit_price_at_add_paise;
    return new;
  end if;

  select * into v_product from public.products where id = new.product_id;
  if not found or not v_product.is_active then
    raise exception 'product is not available' using errcode = 'P0001';
  end if;
  if v_product.has_variants and new.variant_id is null then
    raise exception 'choose a colour for this product' using errcode = 'P0001';
  end if;
  if not v_product.has_variants and new.variant_id is not null then
    raise exception 'this product has no colour options' using errcode = 'P0001';
  end if;
  if new.variant_id is not null and not exists (
    select 1 from public.product_variants where id = new.variant_id and is_active
  ) then
    raise exception 'colour option is not available' using errcode = 'P0001';
  end if;

  new.unit_price_at_add_paise := public.current_unit_price(new.product_id, new.variant_id);
  return new;
end;
$$;

create trigger cart_items_before_write
  before insert or update on public.cart_items
  for each row execute function public.cart_items_before_write();

-- ---------------------------------------------------------------------------
-- Coupons
-- ---------------------------------------------------------------------------
create table public.coupons (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null check (code ~ '^[A-Z0-9_-]{3,32}$'),
  description         text check (char_length(description) <= 500),
  type                public.coupon_type not null,
  -- percent: 1-100. flat: amount in paise.
  value               integer not null check (value > 0),
  min_order_paise     integer not null default 0 check (min_order_paise >= 0),
  max_discount_paise  integer check (max_discount_paise > 0),
  starts_at           timestamptz not null default now(),
  ends_at             timestamptz,
  usage_limit         integer check (usage_limit > 0),
  per_user_limit      integer check (per_user_limit > 0),
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (type <> 'percent' or value <= 100),
  check (ends_at is null or ends_at > starts_at)
);

create unique index coupons_code_key on public.coupons (code);

create trigger coupons_set_updated_at
  before update on public.coupons
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Delivery
-- ---------------------------------------------------------------------------
create table public.serviceable_pincodes (
  pincode                text primary key check (pincode ~ '^[1-9][0-9]{5}$'),
  city                   text not null,
  state                  text not null,
  standard_days          integer not null check (standard_days between 1 and 60),
  express_available      boolean not null default false,
  express_days           integer check (express_days between 1 and 60),
  is_active              boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  check (not express_available or express_days is not null)
);

create index serviceable_pincodes_city_idx on public.serviceable_pincodes (city);

create trigger serviceable_pincodes_set_updated_at
  before update on public.serviceable_pincodes
  for each row execute function public.set_updated_at();

create table public.delivery_methods (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (code ~ '^[a-z_]{2,32}$'),
  name        text not null,
  description text,
  price_paise integer not null default 0 check (price_paise >= 0),
  min_days    integer not null check (min_days >= 0),
  max_days    integer not null,
  is_express  boolean not null default false,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (max_days >= min_days)
);

create trigger delivery_methods_set_updated_at
  before update on public.delivery_methods
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Newsletter
-- ---------------------------------------------------------------------------
create table public.newsletter_subscribers (
  id               uuid primary key default gen_random_uuid(),
  email            text not null check (email = lower(email) and char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  source           text check (char_length(source) <= 50),
  unsubscribed_at  timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index newsletter_subscribers_email_key on public.newsletter_subscribers (email);

create trigger newsletter_subscribers_set_updated_at
  before update on public.newsletter_subscribers
  for each row execute function public.set_updated_at();
