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

Copy `.env.example` to `.env.local` and fill in the values. Each variable is
marked PUBLIC or SERVER in the example file. Never commit `.env.local`, and
never put a secret behind a `NEXT_PUBLIC_` prefix (the build fails if you do).

Where to find the Supabase values: Dashboard > Project Settings > API Keys
(publishable and secret keys) and Data API (project URL).

## 3. Database

The Supabase CLI is installed as a dev dependency. No Docker is needed for
these commands.

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npm run db:push
npm run db:types
```

- `link` asks for your database password in the terminal. Don't paste it anywhere else.
- `db:push` applies everything in `supabase/migrations/`.
- `db:types` regenerates `lib/database.types.ts`. Run it after every migration.

## 4. Seed (development project only)

```bash
npm run seed -- --yes
```

This creates 10 categories, 40 products with colour variants and placeholder
images, the two delivery methods, about 100 serviceable pincodes (Pune first,
then a sample of other metros), test coupons (`WELCOME10`, `FLAT1000`,
`FESTIVE15`, plus `EXPIRED5` and `PAUSED20` for negative tests), and three demo
reviewers with delivered orders and reviews. Re-running it is safe.

## 5. Make yourself an admin

Sign up through the site first, then:

```bash
npm run make-admin -- you@example.com
```

Use `--revoke` to demote. Or, in the Supabase SQL editor:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

Roles live in `public.profiles.role`. Customers cannot change it: the column
is not writable through the API, and a trigger rejects any attempt.

## Payments (Razorpay test mode, works without the database)

Test mode is free and moves no real money.

1. Sign up at https://dashboard.razorpay.com, switch to **Test Mode**, then
   Account & Settings > API Keys > Generate Key. Put the values in `.env.local` as
   `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. Also set
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and
   `NEXT_PUBLIC_SITE_URL` (any valid URL and placeholder key work until the database is connected).
2. `npm run dev` and open http://localhost:3000/pay-demo.
3. Pay with test card `4100 2800 0000 1007`, any future expiry, any CVV, and any
   4 to 10 digit OTP. For UPI, use `success@razorpay` or `failure@razorpay`.

**Webhook (optional locally).** Razorpay can't reach `localhost`, so expose it
with a tunnel, for example `npx cloudflared tunnel --url http://localhost:3000`.
Then in Razorpay (Test Mode) go to Account & Settings > Webhooks > Add New Webhook:

- URL: `https://<tunnel-host>/api/webhooks/razorpay`
- Secret: a long random string, which you also put in `.env.local` as `RAZORPAY_WEBHOOK_SECRET`
- Events: `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`, `refund.failed`

Until the database is connected, prices come from a temporary server-side list
(`lib/payments/demo-catalog.ts`), and webhook events are verified and logged
but not stored.

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
