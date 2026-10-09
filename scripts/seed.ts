/**
 * Seeds a DEVELOPMENT Supabase project with catalogue, delivery, pincode,
 * coupon and demo review data. Idempotent: safe to run more than once.
 *
 *   npm run seed -- --yes
 *
 * Do not run against production. It creates demo customer accounts and
 * delivered demo orders (needed for reviews), which count in analytics.
 */
import { config } from "dotenv";
import { randomBytes } from "node:crypto";
import { deflateSync, crc32 } from "node:zlib";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types";
import {
  CATEGORIES,
  DELIVERY_METHODS,
  DEMO_REVIEWERS,
  PINCODES,
  REVIEW_TEMPLATES,
  seedCoupons,
  type SeedProduct,
} from "./seed-data";

config({ path: ".env.local", quiet: true });

const GST_RATE_BPS = 1800;
const BUCKET = "product-images";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local first.");
  process.exit(1);
}
if (!process.argv.includes("--yes")) {
  console.error(
    `This will write seed data to ${new URL(url).host}.\n` +
      "It is meant for a development project only. Re-run with --yes to continue.",
  );
  process.exit(1);
}

const db = createClient<Database>(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const paise = (rupees: number) => Math.round(rupees * 100);
const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function must<T>(res: { data: T; error: { message: string } | null }, what: string): NonNullable<T> {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  if (res.data === null || res.data === undefined) throw new Error(`${what}: no data returned`);
  return res.data as NonNullable<T>;
}

// ---------------------------------------------------------------------------
// Placeholder images: a solid colour PNG with a lighter band, generated
// locally so the seed needs no network access beyond Supabase.
// ---------------------------------------------------------------------------
function placeholderPng(hex: string, width = 800, height = 600): Buffer {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const light = (c: number) => Math.min(255, Math.round(c + (255 - c) * 0.35));
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 3 + 1);
    raw[rowStart] = 0;
    const band = y > height * 0.62 && y < height * 0.7;
    for (let x = 0; x < width; x++) {
      const i = rowStart + 1 + x * 3;
      raw[i] = band ? light(r) : r;
      raw[i + 1] = band ? light(g) : g;
      raw[i + 2] = band ? light(b) : b;
    }
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData) >>> 0);
    return Buffer.concat([len, typeAndData, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function uploadPlaceholder(path: string, hex: string) {
  const { error } = await db.storage
    .from(BUCKET)
    .upload(path, placeholderPng(hex), { contentType: "image/png", upsert: true });
  if (error) throw new Error(`upload ${path}: ${error.message}`);
}

// ---------------------------------------------------------------------------
async function seedReferenceData() {
  must(
    await db.from("delivery_methods").upsert(DELIVERY_METHODS, { onConflict: "code" }).select("id"),
    "delivery_methods",
  );
  must(
    await db.from("serviceable_pincodes").upsert(PINCODES, { onConflict: "pincode" }).select("pincode"),
    "serviceable_pincodes",
  );
  must(await db.from("coupons").upsert(seedCoupons(), { onConflict: "code" }).select("id"), "coupons");
  console.log(`  ${DELIVERY_METHODS.length} delivery methods, ${PINCODES.length} pincodes, coupons`);
}

async function seedProduct(categoryId: string, p: SeedProduct, index: number) {
  const slug = slugify(p.name);
  const product = must(
    await db
      .from("products")
      .upsert(
        {
          name: p.name,
          slug,
          sku: `FS-${slug.slice(0, 20).toUpperCase()}-${String(index).padStart(3, "0")}`,
          description: p.description,
          category_id: categoryId,
          material: p.material,
          width_cm: p.dims[0],
          depth_cm: p.dims[1],
          height_cm: p.dims[2],
          price_paise: paise(p.price),
          discount_price_paise: p.discount ? paise(p.discount) : null,
          stock: p.variants ? 0 : (p.stock ?? 0),
          is_featured: p.featured ?? false,
          is_active: true,
          specifications: {
            Material: p.material,
            Dimensions: `${p.dims[0]} W x ${p.dims[1]} D x ${p.dims[2]} H cm`,
            ...p.specs,
          },
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single(),
    `product ${p.name}`,
  );

  const firstHex = p.variants?.[0]?.hex ?? "#B5A48B";
  const mainPath = `seed/${slug}/main.png`;
  await uploadPlaceholder(mainPath, firstHex);
  must(
    await db
      .from("product_images")
      .upsert(
        { product_id: product.id, storage_path: mainPath, alt_text: p.name, sort_order: 0 },
        { onConflict: "storage_path" },
      )
      .select("id"),
    `image ${mainPath}`,
  );

  for (const [i, v] of (p.variants ?? []).entries()) {
    const variant = must(
      await db
        .from("product_variants")
        .upsert(
          {
            product_id: product.id,
            colour_name: v.colour,
            colour_hex: v.hex,
            price_override_paise: v.priceOverride ? paise(v.priceOverride) : null,
            stock: v.stock,
            sku: `FS-${slug.slice(0, 20).toUpperCase()}-${String(index).padStart(3, "0")}-${i + 1}`,
            sort_order: i,
            is_active: true,
          },
          { onConflict: "sku" },
        )
        .select("id")
        .single(),
      `variant ${p.name} ${v.colour}`,
    );
    const path = `seed/${slug}/${slugify(v.colour)}.png`;
    await uploadPlaceholder(path, v.hex);
    must(
      await db
        .from("product_images")
        .upsert(
          {
            product_id: product.id,
            variant_id: variant.id,
            storage_path: path,
            alt_text: `${p.name} in ${v.colour}`,
            sort_order: i + 1,
          },
          { onConflict: "storage_path" },
        )
        .select("id"),
      `image ${path}`,
    );
  }
  return product.id;
}

async function seedCatalog() {
  let index = 1;
  let count = 0;
  for (const [sortOrder, c] of CATEGORIES.entries()) {
    const category = must(
      await db
        .from("categories")
        .upsert(
          { name: c.name, slug: c.slug, description: c.description, sort_order: sortOrder, is_active: true },
          { onConflict: "slug" },
        )
        .select("id")
        .single(),
      `category ${c.name}`,
    );
    for (const p of c.products) {
      await seedProduct(category.id, p, index++);
      count++;
    }
    process.stdout.write(`  ${c.name}: ${c.products.length} products\n`);
  }
  console.log(`  ${CATEGORIES.length} categories, ${count} products`);
}

async function findUserByEmail(email: string) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const hit = data.users.find((u) => u.email === email);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

/**
 * Reviews require a delivered order containing the product, so demo
 * reviewers get one delivered order each before reviewing.
 */
async function seedDemoReviews() {
  const standard = must(
    await db.from("delivery_methods").select("id, name").eq("code", "standard").single(),
    "standard delivery method",
  );
  const products = must(
    await db
      .from("products")
      .select("id, name, slug, price_paise, discount_price_paise, product_variants(id, colour_name, sku, price_override_paise), product_images(storage_path, sort_order)")
      .eq("is_featured", true)
      .order("name"),
    "featured products",
  );

  for (const [r, reviewer] of DEMO_REVIEWERS.entries()) {
    let user = await findUserByEmail(reviewer.email);
    if (!user) {
      const created = await db.auth.admin.createUser({
        email: reviewer.email,
        // Random, never stored or printed: these accounts are review authors only.
        password: randomBytes(24).toString("base64url"),
        email_confirm: true,
        user_metadata: { full_name: reviewer.full_name },
      });
      if (created.error) throw new Error(`createUser ${reviewer.email}: ${created.error.message}`);
      user = created.data.user;
    }

    const existing = must(
      await db.from("orders").select("id").eq("user_id", user.id).limit(1),
      "existing demo orders",
    );
    if (existing.length > 0) continue;

    // Each reviewer bought a different slice of the featured products.
    const bought = products.filter((_, i) => i % DEMO_REVIEWERS.length === r || i % 4 === r);
    const lines = bought.map((p) => {
      const variant = p.product_variants[0] ?? null;
      const unit = variant?.price_override_paise ?? p.discount_price_paise ?? p.price_paise;
      const image = [...p.product_images].sort((a, b) => a.sort_order - b.sort_order)[0];
      return { p, variant, unit, image: image?.storage_path ?? null };
    });
    const subtotal = lines.reduce((sum, l) => sum + l.unit, 0);
    const tax = Math.round((subtotal * GST_RATE_BPS) / (10000 + GST_RATE_BPS));
    const placedAt = new Date(Date.now() - (20 + r * 5) * 24 * 60 * 60 * 1000);

    const order = must(
      await db
        .from("orders")
        .insert({
          user_id: user.id,
          status: "delivered",
          payment_status: "paid",
          subtotal_paise: subtotal,
          discount_paise: 0,
          shipping_paise: 0,
          tax_paise: tax,
          gst_rate_bps: GST_RATE_BPS,
          total_paise: subtotal,
          delivery_method_id: standard.id,
          delivery_method_name: standard.name,
          shipping_address: {
            full_name: reviewer.full_name,
            phone: "9800000000",
            house: "Flat 101",
            street: "FC Road",
            city: "Pune",
            state: "Maharashtra",
            pincode: "411004",
          },
          paid_at: placedAt.toISOString(),
          created_at: placedAt.toISOString(),
        })
        .select("id")
        .single(),
      "demo order",
    );

    must(
      await db
        .from("order_items")
        .insert(
          lines.map((l) => ({
            order_id: order.id,
            product_id: l.p.id,
            variant_id: l.variant?.id ?? null,
            quantity: 1,
            product_name: l.p.name,
            product_slug: l.p.slug,
            variant_name: l.variant?.colour_name ?? null,
            sku: l.variant?.sku ?? null,
            image_path: l.image,
            unit_price_paise: l.unit,
            line_total_paise: l.unit,
          })),
        )
        .select("id"),
      "demo order items",
    );

    must(
      await db
        .from("order_status_history")
        .insert(
          (["pending_payment", "confirmed", "processing", "packed", "shipped", "delivered"] as const).map(
            (status, i, all) => ({
              order_id: order.id,
              from_status: i === 0 ? null : all[i - 1],
              status,
              note: i === 0 ? "Demo order (seed data)" : null,
              created_at: new Date(placedAt.getTime() + i * 24 * 60 * 60 * 1000).toISOString(),
            }),
          ),
        )
        .select("id"),
      "demo status history",
    );

    // Count demo units as sales so "best sellers" has data in development.
    for (const l of lines) {
      const cur = must(await db.from("products").select("sales_count").eq("id", l.p.id).single(), "sales_count");
      must(
        await db.from("products").update({ sales_count: cur.sales_count + 1 }).eq("id", l.p.id).select("id"),
        "sales_count update",
      );
    }

    // Reviews are written as the service role, so set user_id explicitly.
    must(
      await db
        .from("reviews")
        .upsert(
          lines.map((l, i) => {
            const t = REVIEW_TEMPLATES[(i + r) % REVIEW_TEMPLATES.length];
            return { user_id: user.id, product_id: l.p.id, rating: t.rating, title: t.title, body: t.body };
          }),
          { onConflict: "user_id,product_id" },
        )
        .select("id"),
      "demo reviews",
    );
  }
  console.log(`  ${DEMO_REVIEWERS.length} demo reviewers with delivered orders and reviews`);
}

async function main() {
  console.log(`Seeding ${new URL(url!).host}`);
  console.log("Reference data");
  await seedReferenceData();
  console.log("Catalogue");
  await seedCatalog();
  console.log("Demo reviews");
  await seedDemoReviews();
  console.log("Done.");
}

main().catch((err: unknown) => {
  console.error("Seed failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
