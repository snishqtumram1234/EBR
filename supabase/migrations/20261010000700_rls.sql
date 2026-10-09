-- Row Level Security and privileges.
--
-- Approach: start from zero privileges for the API roles (anon, authenticated),
-- then grant exactly what each table needs. RLS policies then narrow rows.
-- service_role keeps its default privileges and bypasses RLS; it is only used
-- from server code.

-- ---------------------------------------------------------------------------
-- Privileges: reset
-- ---------------------------------------------------------------------------
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

-- Future objects created by migrations start closed too. (EXECUTE-to-PUBLIC is
-- a global default, so it can only be revoked without "in schema".)
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;
alter default privileges revoke execute on functions from public;

-- Functions used inside RLS policies must be executable by the API roles.
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.can_review_product(uuid) to authenticated;
grant execute on function public.is_valid_order_transition(public.order_status, public.order_status) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table public.profiles               enable row level security;
alter table public.addresses              enable row level security;
alter table public.categories             enable row level security;
alter table public.products               enable row level security;
alter table public.product_variants       enable row level security;
alter table public.product_images         enable row level security;
alter table public.wishlist_items         enable row level security;
alter table public.cart_items             enable row level security;
alter table public.coupons                enable row level security;
alter table public.serviceable_pincodes   enable row level security;
alter table public.delivery_methods       enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.orders                 enable row level security;
alter table public.order_items            enable row level security;
alter table public.order_status_history   enable row level security;
alter table public.payments               enable row level security;
alter table public.refunds                enable row level security;
alter table public.webhook_events         enable row level security;
alter table public.coupon_redemptions     enable row level security;
alter table public.admin_audit_log        enable row level security;
alter table public.reviews                enable row level security;

-- ---------------------------------------------------------------------------
-- profiles: own row only; only name and phone are updatable.
-- ---------------------------------------------------------------------------
grant select on public.profiles to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

create policy profiles_select_own_or_admin on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- addresses / cart_items / wishlist_items: owner only (admins may read).
-- ---------------------------------------------------------------------------
grant select, delete on public.addresses to authenticated;
grant insert (full_name, phone, house, street, landmark, city, state, pincode, is_default)
  on public.addresses to authenticated;
grant update (full_name, phone, house, street, landmark, city, state, pincode, is_default)
  on public.addresses to authenticated;

create policy addresses_select on public.addresses
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy addresses_insert_own on public.addresses
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy addresses_update_own on public.addresses
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy addresses_delete_own on public.addresses
  for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, delete on public.cart_items to authenticated;
grant insert (product_id, variant_id, quantity) on public.cart_items to authenticated;
grant update (quantity) on public.cart_items to authenticated;

create policy cart_items_select on public.cart_items
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy cart_items_insert_own on public.cart_items
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy cart_items_update_own on public.cart_items
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy cart_items_delete_own on public.cart_items
  for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, delete on public.wishlist_items to authenticated;
grant insert (product_id) on public.wishlist_items to authenticated;

create policy wishlist_items_select on public.wishlist_items
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy wishlist_items_insert_own on public.wishlist_items
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy wishlist_items_delete_own on public.wishlist_items
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Catalog: anyone reads active rows; admins read everything and write.
-- ---------------------------------------------------------------------------
grant select on public.categories, public.products, public.product_variants,
               public.product_images, public.delivery_methods, public.serviceable_pincodes
  to anon, authenticated;
grant insert, update, delete on public.categories, public.product_variants,
               public.product_images, public.delivery_methods, public.serviceable_pincodes
  to authenticated;
-- Products: no hard delete through the API (soft delete via is_active).
-- Derived columns (ratings, sales, has_variants) are maintained by triggers only.
grant insert (name, slug, sku, description, category_id, material, width_cm, depth_cm, height_cm,
              price_paise, discount_price_paise, stock, is_active, is_featured, specifications)
  on public.products to authenticated;
grant update (name, slug, sku, description, category_id, material, width_cm, depth_cm, height_cm,
              price_paise, discount_price_paise, stock, is_active, is_featured, specifications)
  on public.products to authenticated;

create policy categories_select on public.categories
  for select to anon, authenticated
  using (is_active or (select public.is_admin()));
create policy categories_admin_insert on public.categories
  for insert to authenticated with check ((select public.is_admin()));
create policy categories_admin_update on public.categories
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy categories_admin_delete on public.categories
  for delete to authenticated using ((select public.is_admin()));

create policy products_select on public.products
  for select to anon, authenticated
  using (is_active or (select public.is_admin()));
create policy products_admin_insert on public.products
  for insert to authenticated with check ((select public.is_admin()));
create policy products_admin_update on public.products
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy product_variants_select on public.product_variants
  for select to anon, authenticated
  using (
    (is_active and exists (select 1 from public.products p where p.id = product_id and p.is_active))
    or (select public.is_admin())
  );
create policy product_variants_admin_insert on public.product_variants
  for insert to authenticated with check ((select public.is_admin()));
create policy product_variants_admin_update on public.product_variants
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy product_variants_admin_delete on public.product_variants
  for delete to authenticated using ((select public.is_admin()));

create policy product_images_select on public.product_images
  for select to anon, authenticated
  using (
    exists (select 1 from public.products p where p.id = product_id and p.is_active)
    or (select public.is_admin())
  );
create policy product_images_admin_insert on public.product_images
  for insert to authenticated with check ((select public.is_admin()));
create policy product_images_admin_update on public.product_images
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy product_images_admin_delete on public.product_images
  for delete to authenticated using ((select public.is_admin()));

create policy delivery_methods_select on public.delivery_methods
  for select to anon, authenticated
  using (is_active or (select public.is_admin()));
create policy delivery_methods_admin_insert on public.delivery_methods
  for insert to authenticated with check ((select public.is_admin()));
create policy delivery_methods_admin_update on public.delivery_methods
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy delivery_methods_admin_delete on public.delivery_methods
  for delete to authenticated using ((select public.is_admin()));

create policy serviceable_pincodes_select on public.serviceable_pincodes
  for select to anon, authenticated
  using (is_active or (select public.is_admin()));
create policy serviceable_pincodes_admin_insert on public.serviceable_pincodes
  for insert to authenticated with check ((select public.is_admin()));
create policy serviceable_pincodes_admin_update on public.serviceable_pincodes
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy serviceable_pincodes_admin_delete on public.serviceable_pincodes
  for delete to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Reviews: public read; owner writes only when eligible; admins may delete.
-- ---------------------------------------------------------------------------
grant select on public.reviews to anon, authenticated;
grant insert (product_id, rating, title, body) on public.reviews to authenticated;
grant update (rating, title, body) on public.reviews to authenticated;
grant delete on public.reviews to authenticated;

create policy reviews_select on public.reviews
  for select to anon, authenticated
  using (true);
create policy reviews_insert_own_eligible on public.reviews
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_review_product(product_id));
create policy reviews_update_own_eligible on public.reviews
  for update to authenticated
  using (user_id = (select auth.uid()) and public.can_review_product(product_id))
  with check (user_id = (select auth.uid()) and public.can_review_product(product_id));
create policy reviews_delete_own_eligible_or_admin on public.reviews
  for delete to authenticated
  using (
    (user_id = (select auth.uid()) and public.can_review_product(product_id))
    or (select public.is_admin())
  );

-- ---------------------------------------------------------------------------
-- Orders and money: owner reads, nobody writes through the API.
-- ---------------------------------------------------------------------------
grant select on public.orders, public.order_items, public.order_status_history,
               public.payments, public.refunds
  to authenticated;

create policy orders_select_own_or_admin on public.orders
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy order_items_select_own_or_admin on public.order_items
  for select to authenticated
  using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
    or (select public.is_admin())
  );

create policy order_status_history_select_own_or_admin on public.order_status_history
  for select to authenticated
  using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
    or (select public.is_admin())
  );

create policy payments_select_own_or_admin on public.payments
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy refunds_select_own_or_admin on public.refunds
  for select to authenticated
  using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
    or (select public.is_admin())
  );

-- ---------------------------------------------------------------------------
-- Coupons: never readable by customers; validated through server functions.
-- ---------------------------------------------------------------------------
grant select, insert, update on public.coupons to authenticated;

create policy coupons_admin_select on public.coupons
  for select to authenticated using ((select public.is_admin()));
create policy coupons_admin_insert on public.coupons
  for insert to authenticated with check ((select public.is_admin()));
create policy coupons_admin_update on public.coupons
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

grant select on public.coupon_redemptions to authenticated;
create policy coupon_redemptions_admin_select on public.coupon_redemptions
  for select to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Server-only tables: admins may read, nobody writes through the API.
-- ---------------------------------------------------------------------------
grant select on public.webhook_events, public.admin_audit_log, public.newsletter_subscribers
  to authenticated;

create policy webhook_events_admin_select on public.webhook_events
  for select to authenticated using ((select public.is_admin()));
create policy admin_audit_log_admin_select on public.admin_audit_log
  for select to authenticated using ((select public.is_admin()));
create policy newsletter_subscribers_admin_select on public.newsletter_subscribers
  for select to authenticated using ((select public.is_admin()));
