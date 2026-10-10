# Furniture Store: backend

Next.js (App Router, TypeScript strict) + Supabase (Postgres, Auth, Storage) +
Razorpay. The visual design is built separately; pages here are unstyled
placeholders that call the typed data layer in `lib/`.

- `docs/SCHEMA.md`: tables, relationships, and the access rule for each table
- `docs/API.md`: frontend handover (grows phase by phase)
- `docs/GO_LIVE.md`: production checklist (Phase 8)

> This README covers setup up to the current phase. It will be completed in Phase 8.

## Prerequisites

- **Node.js 24** (see `.nvmrc`). Node 20 is end-of-life and the test runner
  needs Node 22 or newer. With nvm for Windows: `nvm use 24.12.0`.
- A Supabase project (hosted). **Use a separate project for development and
  production.** The seed script creates demo accounts and orders.

## 1. Install

```bash
npm install
```

## 2. Environment

Create `.env.local` (copy `.env.example`, then fill it in). **Put real values in
`.env.local` only.** `.env.example` is a blank template that is committed to git
and is never read by the server; the server reads `.env.local`.

| Variable | Where to find it | Needed for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard > Project Settings > Data API (Project URL) | everything |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings > API Keys (publishable) | login, reading data |
| `SUPABASE_SECRET_KEY` | Project Settings > API Keys (secret). Server only, bypasses RLS | orders, payments, owner screen, seed |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` while developing | email confirmation links |
| `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_ENV=sandbox` | Cashfree dashboard (Test mode) > Developers > API Keys | card / netbanking checkout |
| `UPI_VPA`, `UPI_PAYEE_NAME` | your own UPI ID and the shop name | UPI QR payments |

Never paste secret keys into chat or commit them. The build fails if client
code references a secret.

## 3. Database (hosted Supabase, no Docker)

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npm run db:push
npm run db:types
```

- `link` asks for the database password: type it in the terminal only.
- `db:push` applies everything in `supabase/migrations/` (tables, row level
  security, order functions, the 5-minute expiry job).
- `db:types` replaces the placeholder `lib/database.types.ts` with generated types.
  Run it after every migration.

In the Supabase dashboard, for a demo: **Authentication > Sign In / Providers >
Email > turn "Confirm email" off**. Supabase's built-in email sender is heavily
rate-limited, so with confirmation on, signups can stall.

## 4. Seed

```bash
npm run seed -- --yes
```

Loads the 10 Aurelle products (same ids and prices as the storefront), a hidden
₹1 payment-test item, Standard and Express delivery, about 100 serviceable
pincodes (Pune first) and test coupons. Safe to run again; it does not refill
stock for products that already exist.

## 5. Make yourself the owner (admin)

Sign up on the site first, then:

```bash
npm run make-admin -- you@example.com
```

Log in and open **Account > Owner dashboard** (`/admin`). Roles live in
`public.profiles.role`, which customers cannot write.

## How orders and payments work

1. The customer logs in and checks out. `create_order` (a database function)
   checks stock, prices everything from the database, checks the pincode and
   holds the stock for 30 minutes.
2. **Cashfree**: our order number is the Cashfree order id. After payment the
   server asks Cashfree for the real result and calls `mark_order_paid`.
3. **UPI QR**: the QR carries the exact total. The customer sends the 12-digit
   UTR; the order shows "verifying" until the owner matches it against the bank
   statement on the owner screen and confirms (or rejects, with a reason).
4. Unpaid orders are cancelled and their stock returned by a scheduled job
   every 5 minutes. Orders waiting on the owner (UTR sent) are never expired.

The owner screen is at `/admin` (admins only; non-admins get a 404).

## Payments through Razorpay

Razorpay routes (`/api/payment/create-order`, `/verify`, `/api/webhooks/razorpay`)
still exist from the first version but are not used by the storefront.

## Tests

```bash
npm test
```

Database tests apply every real migration to an in-process Postgres (PGlite)
with a small stand-in for Supabase's `auth` and `storage` schemas, then check
RLS, triggers and SQL functions. They need no network or Docker. Tests that
must hit the hosted database (concurrency, the real API) are added in later
phases as an opt-in suite.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Secret-exposure check, then `next build` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit and database tests |
| `npm run check:secrets` | Fails if client code can reach a server secret |
| `npm run db:push` | Apply migrations to the linked project |
| `npm run db:types` | Regenerate Supabase TypeScript types |
| `npm run seed -- --yes` | Seed a development project |
| `npm run make-admin -- <email>` | Promote an account to admin |
