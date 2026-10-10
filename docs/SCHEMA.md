# Database schema

All tables live in the `public` schema and have Row Level Security enabled.
Money is always `integer` paise. Every table has `created_at` and `updated_at`
(maintained by the `set_updated_at` trigger).

Migrations: `supabase/migrations/`. Never edit the schema in the dashboard.

## Privilege model

1. The API roles (`anon`, `authenticated`) start with **no privileges at all**
   (`20261010000700_rls.sql` revokes everything, including default privileges
   for future tables and functions).
2. Each table then gets explicit grants. Where users may write, grants are
   **column-level**, so for example a customer can update `profiles.full_name`
   but the database rejects any attempt to touch `profiles.role`.
3. RLS policies narrow which rows a role sees or changes.
4. `service_role` (the secret key) bypasses RLS. It is used only in server code
   for webhooks, payment verification, order finalisation, the expiry job,
   refunds and seeding.
5. `public.is_admin()` (security definer) is the single admin check used by
   policies and by server code.

## Users

| Table | Purpose | Who can do what |
|---|---|---|
| `profiles` | One row per auth user, created by the `on_auth_user_created` trigger. Name, phone, `role` (`customer`/`admin`). | Users read and update their own name and phone. Nobody can change `role` through the API (column privilege + trigger). Admins read all. Promote with `npm run make-admin`. |
| `addresses` | Delivery addresses. One default per user, enforced by a partial unique index; triggers keep exactly one default (first address becomes default, deleting the default promotes another). | Owner reads/writes their own. Admins read all. |
| `wishlist_items` | User + product, unique together. | Owner reads, adds, removes. Admins read all. |

## Catalog

| Table | Purpose | Who can do what |
|---|---|---|
| `categories` | Name, slug, optional parent, image, sort order, active flag. | Anyone reads active rows. Admins read all and write. |
| `products` | Core product data. `effective_price_paise` (generated) = discount price or price, used for listing filters and sorts. `search_vector` (generated) weights name > material > description; a trigram index on `name` handles partial and misspelled searches. `has_variants` is maintained by trigger. `rating_avg`/`rating_count` maintained from reviews; `sales_count` maintained by order functions. | Anyone reads active products. Admins write, but only editable columns (derived columns are trigger-owned). No hard delete through the API; deactivate instead. Order items reference products with `on delete restrict`, so ordered products can never be hard-deleted. |
| `product_variants` | Colour options: name, hex, optional price override, own stock and SKU. When a product has variants, stock lives here and `products.stock` is ignored. | Anyone reads active variants of active products. Admins write. |
| `product_images` | Storage path, alt text, sort order, optional variant. A composite foreign key guarantees an image's variant belongs to the same product. | Anyone reads images of active products. Admins write. |
| `reviews` | Rating 1-5, title, body. Unique per user + product. `author_name` is copied from the profile by trigger (profiles are private). | Anyone reads. A user may insert/update/delete only their own review and only if `can_review_product()` is true (they have a delivered order containing the product). Admins may delete (moderation). |

## Shopping

| Table | Purpose | Who can do what |
|---|---|---|
| `cart_items` | User + product + variant (unique, nulls not distinct), quantity 1-10. `unit_price_at_add_paise` is set by trigger from the database price, never by the client, and is used only to flag price changes. The trigger also rejects inactive products and wrong variant choices. | Owner reads and writes their own lines (only `product_id`, `variant_id`, `quantity` are writable). |
| `coupons` | Code, percent/flat, value, minimum order, maximum discount, date window, total and per-user limits, active flag. | Customers cannot read coupons at all; codes are validated through server functions. Admins read and write. |
| `coupon_redemptions` | Coupon + user + order (one per order). Written when an order is paid. | Admins read. |
| `serviceable_pincodes` | Pincode, city, state, standard days, express availability and days. | Anyone reads active rows. Admins write. |
| `delivery_methods` | Standard (free, 5-7 days) and Express (₹499, 2-3 days). | Anyone reads active rows. Admins write. |
| `newsletter_subscribers` | Unique lowercase email. | Written only by the rate-limited server endpoint. Admins read. |

## Orders and money

Customers can **read** their own rows in these tables and **cannot write any of
them**: no insert, update or delete privilege is granted to `anon` or
`authenticated`. All writes go through security-definer SQL functions or
service-role server code.

| Table | Purpose |
|---|---|
| `orders` | Order number `ORD-10001` onwards from `order_number_seq`. Status, payment status, amounts in paise (`total = subtotal - discount + shipping`, enforced by a check constraint), GST component (`tax_paise`, included in total) and rate, coupon, delivery method snapshot, expected delivery date, **shipping address snapshot (jsonb)**, `cart_hash` for duplicate prevention, `expires_at` for unpaid orders, `needs_review` flag for money that needs a human (e.g. captured after expiry). |
| `order_items` | Snapshots of product name, slug, variant name, SKU, image and unit price at purchase time. |
| `order_status_history` | Every status change with note and actor (null = system). Drives the tracking timeline. |
| `payments` | One row per payment attempt. `provider` is `cashfree`, `razorpay` or `upi`; `provider_order_id` is unique per provider (for Cashfree it is our order number, for UPI the reference shown in the UPI app). UPI rows also hold the customer's `utr`. Amount, status, method, failure reason, refunded amount. |
| `refunds` | Razorpay refund id, amount, status (`pending`/`processed`/`failed`), reason, initiator. Status is updated from webhooks, not assumed. |
| `webhook_events` | Razorpay event id (unique) for idempotency, type, payload, processed time, error. Admins read; nobody else. |
| `admin_audit_log` | Who, what action, which record, before/after jsonb. Admins read; written only by triggers/functions. |

### Order status transitions

Defined once in `public.is_valid_order_transition()` and enforced by a trigger
on `orders`, so no writer, including the service role, can make an illegal move.

```
pending_payment -> confirmed | cancelled
confirmed       -> processing | cancelled
processing      -> packed | cancelled
packed          -> shipped | cancelled
shipped         -> out_for_delivery | delivered
out_for_delivery-> delivered
delivered       -> refunded
cancelled       -> refunded
refunded        -> (final)
```

Partial refunds do not change order status; they set `payment_status =
partially_refunded`.

## Storage

Bucket `product-images`: public read; insert, update and delete only when
`is_admin()`; 5 MB limit; JPEG, PNG, WebP and AVIF only (SVG is excluded
because it can carry scripts). The admin upload flow stores the object path in
`product_images.storage_path`.

## Order functions (SQL)

All run in one transaction. Only `create_order` is callable by customers; the
rest are `service_role` only and the owner ones re-check that the actor is an admin.

| Function | What it does |
|---|---|
| `create_order(items, delivery, address)` | Customer, own session. Validates input, checks the pincode and Express availability, locks the products, checks stock, prices from the database, snapshots address and items, takes stock, writes the first history row. Reuses an identical unpaid order from the last 10 minutes. Unpaid orders expire after 30 minutes. |
| `submit_upi_payment(reference, user, utr)` | Records the customer's UTR (unique) and stops the order from expiring while the owner checks. |
| `mark_order_paid(payment, ...)` | The one function behind "this payment is real": payment paid, order confirmed, history row, sales count. Safe to call repeatedly. Money for an already cancelled order is flagged `needs_review` instead of being kept silently. |
| `admin_confirm_payment`, `reject_upi_payment` | Owner confirms or rejects a UPI payment (rejection lets the customer correct the reference). |
| `admin_set_order_status` | Owner moves an order along legal transitions only; cancelling returns stock. Writes `admin_audit_log`. |
| `cancel_order` | Customer, owner or expiry. Returns stock exactly once. |
| `cancel_expired_orders` | Scheduled every 5 minutes with pg_cron. |
