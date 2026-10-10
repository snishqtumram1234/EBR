import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  asAnon,
  asSuperuser,
  asUser,
  createTestDb,
  createUser,
  makeAdmin,
} from "../helpers/pglite";

let db: PGlite;
let alice: string;
let bob: string;
let admin: string;
let productId: string;
let aliceOrderId: string;

async function seedCatalogAndOrder() {
  await asSuperuser(db);
  const cat = await db.query<{ id: string }>(
    "insert into categories (name, slug) values ('Sofas', 'sofas') returning id",
  );
  const prod = await db.query<{ id: string }>(
    `insert into products (name, slug, category_id, price_paise, stock)
     values ('Oslo Sofa', 'oslo-sofa', $1, 4999900, 5) returning id`,
    [cat.rows[0].id],
  );
  productId = prod.rows[0].id;
  const dm = await db.query<{ id: string }>(
    "insert into delivery_methods (code, name, price_paise, min_days, max_days) values ('standard', 'Standard', 0, 5, 7) returning id",
  );
  const order = await db.query<{ id: string }>(
    `insert into orders (user_id, subtotal_paise, total_paise, gst_rate_bps, delivery_method_id,
                         delivery_method_name, shipping_address)
     values ($1, 4999900, 4999900, 1800, $2, 'Standard', '{"city":"Pune"}') returning id`,
    [alice, dm.rows[0].id],
  );
  aliceOrderId = order.rows[0].id;
  await db.query(
    `insert into order_items (order_id, product_id, quantity, product_name, product_slug,
                              unit_price_paise, line_total_paise)
     values ($1, $2, 1, 'Oslo Sofa', 'oslo-sofa', 4999900, 4999900)`,
    [aliceOrderId, productId],
  );
  await db.query(
    `insert into payments (order_id, user_id, provider, provider_order_id, amount_paise)
     values ($1, $2, 'cashfree', 'ORD-10001', 4999900)`,
    [aliceOrderId, alice],
  );
}

beforeAll(async () => {
  db = await createTestDb();
  alice = await createUser(db, "alice@example.com", { full_name: "Alice Rao", role: "admin" });
  bob = await createUser(db, "bob@example.com", { full_name: "Bob Iyer" });
  admin = await createUser(db, "admin@example.com");
  await makeAdmin(db, admin);
  await seedCatalogAndOrder();
});

afterAll(async () => {
  await db.close();
});

describe("schema", () => {
  it("has RLS enabled on every public table", async () => {
    await asSuperuser(db);
    const res = await db.query<{ relname: string }>(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
    );
    expect(res.rows).toEqual([]);
  });

  it("creates a customer profile on signup and ignores role in metadata", async () => {
    await asSuperuser(db);
    const res = await db.query<{ role: string; full_name: string }>(
      "select role, full_name from profiles where id = $1",
      [alice],
    );
    expect(res.rows[0]).toEqual({ role: "customer", full_name: "Alice Rao" });
  });
});

describe("customer isolation", () => {
  it("a customer cannot read another customer's orders, items or payments", async () => {
    await asUser(db, bob);
    expect((await db.query("select * from orders")).rows).toHaveLength(0);
    expect((await db.query("select * from order_items")).rows).toHaveLength(0);
    expect((await db.query("select * from payments")).rows).toHaveLength(0);
    expect(
      (await db.query("select * from orders where id = $1", [aliceOrderId])).rows,
    ).toHaveLength(0);
  });

  it("a customer can read their own order", async () => {
    await asUser(db, alice);
    const res = await db.query("select id from orders");
    expect(res.rows).toHaveLength(1);
  });

  it("a customer cannot mark their own order as paid", async () => {
    await asUser(db, alice);
    await expect(
      db.query("update orders set payment_status = 'paid', status = 'confirmed' where id = $1", [
        aliceOrderId,
      ]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.query("update payments set status = 'paid' where order_id = $1", [aliceOrderId]),
    ).rejects.toThrow(/permission denied/);
    await asSuperuser(db);
    const res = await db.query<{ payment_status: string }>(
      "select payment_status from orders where id = $1",
      [aliceOrderId],
    );
    expect(res.rows[0].payment_status).toBe("pending");
  });

  it("a customer cannot create orders or payments directly", async () => {
    await asUser(db, alice);
    await expect(
      db.query(
        `insert into orders (user_id, subtotal_paise, total_paise, gst_rate_bps, delivery_method_id,
                             delivery_method_name, shipping_address)
         select $1, 1, 1, 1800, id, 'x', '{}' from delivery_methods limit 1`,
        [alice],
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("a customer cannot change a product price", async () => {
    await asUser(db, alice);
    const res = await db.query("update products set price_paise = 100 where id = $1", [productId]);
    expect(res.affectedRows).toBe(0);
    await asSuperuser(db);
    const p = await db.query<{ price_paise: number }>(
      "select price_paise from products where id = $1",
      [productId],
    );
    expect(p.rows[0].price_paise).toBe(4999900);
  });

  it("a customer cannot change their own role", async () => {
    await asUser(db, alice);
    await expect(
      db.query("update profiles set role = 'admin' where id = $1", [alice]),
    ).rejects.toThrow(/permission denied/);
  });

  it("a customer can update their own name but not someone else's", async () => {
    await asUser(db, alice);
    const own = await db.query("update profiles set full_name = 'Alice R' where id = $1", [alice]);
    expect(own.affectedRows).toBe(1);
    const other = await db.query("update profiles set full_name = 'Hacked' where id = $1", [bob]);
    expect(other.affectedRows).toBe(0);
  });

  it("cart prices come from the database, not the client", async () => {
    await asUser(db, alice);
    await expect(
      db.query(
        "insert into cart_items (product_id, quantity, unit_price_at_add_paise) values ($1, 1, 1)",
        [productId],
      ),
    ).rejects.toThrow(/permission denied/);
    await db.query("insert into cart_items (product_id, quantity) values ($1, 1)", [productId]);
    const res = await db.query<{ unit_price_at_add_paise: number; user_id: string }>(
      "select unit_price_at_add_paise, user_id from cart_items",
    );
    expect(res.rows).toEqual([{ unit_price_at_add_paise: 4999900, user_id: alice }]);
  });

  it("a customer cannot read coupons or webhook events", async () => {
    await asSuperuser(db);
    await db.query("insert into coupons (code, type, value) values ('WELCOME10', 'percent', 10)");
    await asUser(db, alice);
    expect((await db.query("select * from coupons")).rows).toHaveLength(0);
    expect((await db.query("select * from webhook_events")).rows).toHaveLength(0);
    await asAnon(db);
    await expect(db.query("select * from coupons")).rejects.toThrow(/permission denied/);
  });
});

describe("admin", () => {
  it("an admin can read every order and change a price", async () => {
    await asUser(db, admin);
    expect((await db.query("select id from orders")).rows).toHaveLength(1);
    const res = await db.query("update products set price_paise = 4599900 where id = $1", [
      productId,
    ]);
    expect(res.affectedRows).toBe(1);
  });

  it("is_admin() reflects the caller", async () => {
    await asUser(db, admin);
    expect((await db.query<{ a: boolean }>("select is_admin() as a")).rows[0].a).toBe(true);
    await asUser(db, alice);
    expect((await db.query<{ a: boolean }>("select is_admin() as a")).rows[0].a).toBe(false);
  });
});

describe("catalog visibility", () => {
  it("anonymous visitors see only active products", async () => {
    await asSuperuser(db);
    await db.query(
      `insert into products (name, slug, category_id, price_paise)
       select 'Hidden', 'hidden', category_id, 100 from products limit 1`,
    );
    await db.query("update products set is_active = false where slug = 'hidden'");
    await asAnon(db);
    const res = await db.query<{ slug: string }>("select slug from products order by slug");
    expect(res.rows.map((r) => r.slug)).toEqual(["oslo-sofa"]);
  });
});

describe("order status transitions", () => {
  it("rejects an illegal transition even for the service role", async () => {
    await asSuperuser(db);
    await expect(
      db.query("update orders set status = 'delivered' where id = $1", [aliceOrderId]),
    ).rejects.toThrow(/illegal order status transition/);
  });
});

describe("reviews", () => {
  it("only customers with a delivered order for the product can review it", async () => {
    await asUser(db, bob);
    await expect(
      db.query("insert into reviews (product_id, rating, title) values ($1, 5, 'Great')", [
        productId,
      ]),
    ).rejects.toThrow(/row-level security/);

    // Walk Alice's order to delivered through legal transitions.
    await asSuperuser(db);
    for (const s of ["confirmed", "processing", "packed", "shipped", "delivered"]) {
      await db.query("update orders set status = $1 where id = $2", [s, aliceOrderId]);
    }

    await asUser(db, alice);
    await db.query("insert into reviews (product_id, rating, title) values ($1, 4, 'Comfy')", [
      productId,
    ]);
    await asAnon(db);
    const p = await db.query<{ rating_avg: string; rating_count: number }>(
      "select rating_avg, rating_count from products where id = $1",
      [productId],
    );
    expect(p.rows[0]).toEqual({ rating_avg: "4.00", rating_count: 1 });
    const r = await db.query<{ author_name: string }>("select author_name from reviews");
    expect(r.rows[0].author_name).toBe("Alice");
  });
});
