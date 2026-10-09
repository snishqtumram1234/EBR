-- Catalog: categories, products, variants, images, reviews, wishlist.

create table public.categories (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 1 and 100),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description  text check (char_length(description) <= 2000),
  parent_id    uuid references public.categories (id) on delete restrict,
  image_path   text,
  sort_order   integer not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (parent_id is null or parent_id <> id)
);

create index categories_parent_id_idx on public.categories (parent_id);
create index categories_active_sort_idx on public.categories (is_active, sort_order);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
create table public.products (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null check (char_length(name) between 1 and 200),
  slug                  text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sku                   text unique check (char_length(sku) between 1 and 64),
  description           text not null default '' check (char_length(description) <= 10000),
  category_id           uuid not null references public.categories (id) on delete restrict,
  material              text check (char_length(material) <= 100),
  width_cm              numeric(7, 2) check (width_cm > 0),
  depth_cm              numeric(7, 2) check (depth_cm > 0),
  height_cm             numeric(7, 2) check (height_cm > 0),
  price_paise           integer not null check (price_paise > 0),
  discount_price_paise  integer check (discount_price_paise > 0),
  -- Price shown in listings, used for price filters and sorting.
  effective_price_paise integer generated always as (coalesce(discount_price_paise, price_paise)) stored,
  -- Only meaningful when the product has no variants; otherwise stock lives on variants.
  stock                 integer not null default 0 check (stock >= 0),
  -- Maintained by trigger from product_variants. Never set directly.
  has_variants          boolean not null default false,
  is_active             boolean not null default true,
  is_featured           boolean not null default false,
  rating_avg            numeric(3, 2) not null default 0 check (rating_avg between 0 and 5),
  rating_count          integer not null default 0 check (rating_count >= 0),
  -- Units sold in paid orders. Maintained by order functions; drives "popular" and best sellers.
  sales_count           integer not null default 0 check (sales_count >= 0),
  specifications        jsonb not null default '{}'::jsonb check (jsonb_typeof(specifications) = 'object'),
  search_vector         tsvector generated always as (
    setweight(to_tsvector('english'::regconfig, coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english'::regconfig, coalesce(material, '')), 'B') ||
    setweight(to_tsvector('english'::regconfig, coalesce(description, '')), 'C')
  ) stored,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (discount_price_paise is null or discount_price_paise < price_paise)
);

create index products_category_id_idx on public.products (category_id);
create index products_active_created_idx on public.products (is_active, created_at desc);
create index products_effective_price_idx on public.products (effective_price_paise);
create index products_rating_idx on public.products (rating_avg desc, rating_count desc);
create index products_sales_idx on public.products (sales_count desc);
create index products_featured_idx on public.products (is_featured) where is_featured;
create index products_material_idx on public.products (lower(material));
create index products_search_idx on public.products using gin (search_vector);
create index products_name_trgm_idx on public.products using gin (name extensions.gin_trgm_ops);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Variants (colour options)
-- ---------------------------------------------------------------------------
create table public.product_variants (
  id                   uuid primary key default gen_random_uuid(),
  product_id           uuid not null references public.products (id) on delete restrict,
  colour_name          text not null check (char_length(colour_name) between 1 and 60),
  colour_hex           text not null check (colour_hex ~ '^#[0-9A-Fa-f]{6}$'),
  price_override_paise integer check (price_override_paise > 0),
  stock                integer not null default 0 check (stock >= 0),
  sku                  text not null unique check (char_length(sku) between 1 and 64),
  sort_order           integer not null default 0,
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (product_id, colour_name),
  -- Lets other tables reference a variant together with its product, so a
  -- variant can never be attached to the wrong product.
  unique (id, product_id)
);

create index product_variants_product_id_idx on public.product_variants (product_id, sort_order);
create index product_variants_colour_idx on public.product_variants (lower(colour_name));

create trigger product_variants_set_updated_at
  before update on public.product_variants
  for each row execute function public.set_updated_at();

create or replace function public.sync_product_has_variants()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product_id uuid := coalesce(new.product_id, old.product_id);
begin
  update public.products p
     set has_variants = exists (select 1 from public.product_variants v where v.product_id = p.id)
   where p.id = v_product_id;
  if tg_op = 'UPDATE' and new.product_id is distinct from old.product_id then
    raise exception 'variant cannot move between products' using errcode = '42501';
  end if;
  return null;
end;
$$;

create trigger product_variants_sync_has_variants
  after insert or update of product_id or delete on public.product_variants
  for each row execute function public.sync_product_has_variants();

-- ---------------------------------------------------------------------------
-- Images
-- ---------------------------------------------------------------------------
create table public.product_images (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products (id) on delete cascade,
  variant_id    uuid,
  storage_path  text not null unique check (char_length(storage_path) between 1 and 500),
  alt_text      text not null default '' check (char_length(alt_text) <= 300),
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  foreign key (variant_id, product_id) references public.product_variants (id, product_id) on delete cascade
);

create index product_images_product_idx on public.product_images (product_id, sort_order);
create index product_images_variant_idx on public.product_images (variant_id);

create trigger product_images_set_updated_at
  before update on public.product_images
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Wishlist
-- ---------------------------------------------------------------------------
create table public.wishlist_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, product_id)
);

create index wishlist_items_product_id_idx on public.wishlist_items (product_id);

create trigger wishlist_items_set_updated_at
  before update on public.wishlist_items
  for each row execute function public.set_updated_at();
