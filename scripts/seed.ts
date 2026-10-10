/**
 * Seeds a Supabase project with the Aurelle catalogue (the same products,
 * prices and slugs the storefront shows), delivery methods, serviceable
 * pincodes (Pune first) and test coupons. Idempotent: safe to run again.
 *
 *   npm run seed -- --yes
 *
 * Prices: the storefront's MRP is products.price_paise and its selling price
 * is products.discount_price_paise, so create_order charges the selling price.
 * Stock is reset only when a product is first created.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types";
import { CATEGORIES, PRODUCTS, type ProductKind } from "../lib/catalog/products";
import { DELIVERY_METHODS, PINCODES, seedCoupons } from "./seed-data";

config({ path: ".env.local", quiet: true });

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local first.");
  process.exit(1);
}
if (!process.argv.includes("--yes")) {
  console.error(`This will write data to ${new URL(url).host}. Re-run with --yes to continue.`);
  process.exit(1);
}

const db = createClient<Database>(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function must<T>(res: { data: T; error: { message: string } | null }, what: string): NonNullable<T> {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  if (res.data === null || res.data === undefined) throw new Error(`${what}: no data returned`);
  return res.data as NonNullable<T>;
}

async function seedReference() {
  must(await db.from("delivery_methods").upsert(DELIVERY_METHODS, { onConflict: "code" }).select("id"), "delivery_methods");
  must(await db.from("serviceable_pincodes").upsert(PINCODES, { onConflict: "pincode" }).select("pincode"), "serviceable_pincodes");
  must(await db.from("coupons").upsert(seedCoupons(), { onConflict: "code" }).select("id"), "coupons");
  console.log(`  ${DELIVERY_METHODS.length} delivery methods, ${PINCODES.length} pincodes, coupons`);
}

async function seedCatalog() {
  const categoryIds = new Map<ProductKind, string>();
  const rows = [
    ...CATEGORIES.map((c, i) => ({ kind: c.kind as ProductKind, name: c.name, sort: i, active: true })),
    { kind: "test" as ProductKind, name: "Payment testing", sort: 99, active: false },
  ];
  for (const c of rows) {
    const row = must(
      await db
        .from("categories")
        .upsert({ name: c.name, slug: slugify(c.name), sort_order: c.sort, is_active: c.active }, { onConflict: "slug" })
        .select("id")
        .single(),
      `category ${c.name}`,
    );
    categoryIds.set(c.kind, row.id);
  }

  // Keep stock for products that already exist (do not refill during a re-seed).
  const existing = must(await db.from("products").select("slug"), "existing products");
  const have = new Set((existing as { slug: string }[]).map((p) => p.slug));

  for (const p of PRODUCTS) {
    const dims = /(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)/.exec(p.dims);
    const base: Record<string, unknown> = {
      name: p.name,
      slug: p.id,
      sku: `AUR-${String(p.num).padStart(3, "0")}`,
      description: p.desc,
      category_id: categoryIds.get(p.kind)!,
      material: p.material,
      width_cm: dims ? Number(dims[1]) : null,
      depth_cm: dims ? Number(dims[2]) : null,
      height_cm: dims ? Number(dims[3]) : null,
      price_paise: p.mrpPaise,
      discount_price_paise: p.pricePaise < p.mrpPaise ? p.pricePaise : null,
      is_active: true,
      is_featured: p.num <= 3,
      specifications: { Material: p.material, Dimensions: p.dims },
    };
    const saved = must(
      await db
        .from("products")
        .upsert((have.has(p.id) ? base : { ...base, stock: p.kind === "test" ? 1000 : 20 }) as never, { onConflict: "slug" })
        .select("id")
        .single(),
      `product ${p.name}`,
    );
    must(await db.from("products").update({ rating_avg: p.rating }).eq("id", saved.id).select("id"), `rating ${p.name}`);
  }
  console.log(`  ${CATEGORIES.length} categories, ${PRODUCTS.length} products (including the hidden ₹1 payment test item)`);
}

async function main() {
  console.log(`Seeding ${new URL(url!).host}`);
  console.log("Reference data");
  await seedReference();
  console.log("Catalogue");
  await seedCatalog();
  console.log("Done.");
}

main().catch((err: unknown) => {
  console.error("Seed failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
