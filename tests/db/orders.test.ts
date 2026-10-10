import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asAnon, asServiceRole, asSuperuser, asUser, createTestDb, createUser, makeAdmin } from "../helpers/pglite";

let db: PGlite;
let alice: string;
let bob: string;
let admin: string;

const address = { full_name: "Alice Rao", phone: "9876543210", house: "Flat 1", street: "Baner Road", city: "Pune", state: "Maharashtra", pincode: "411045" };

type Placed = { order_id: string; order_number: string; total_paise: number; reused: boolean };

async function place(user: string, items: { product: string; quantity: number }[], method = "standard", addr = address): Promise<Placed> {
  await asUser(db, user);
  const res = await db.query<Placed>("select * from create_order($1::jsonb, $2, $3::jsonb)", [
    JSON.stringify(items),
    method,
    JSON.stringify(addr),
  ]);
  return res.rows[0];
}

const stockOf = async (slug: string) => {
  await asSuperuser(db);
  return (await db.query<{ stock: number }>("select stock from products where slug = $1", [slug])).rows[0].stock;
};

async function addPayment(orderId: string, user: string, ref = "FSTEST1", provider = "upi", amount = 100) {
  await asSuperuser(db);
  const r = await db.query<{ id: string }>(
    "insert into payments (order_id, user_id, provider, provider_order_id, amount_paise) values ($1, $2, $3, $4, $5) returning id",
    [orderId, user, provider, ref, amount],
  );
  return r.rows[0].id;
}

beforeAll(async () => {
  db = await createTestDb();
  alice = await createUser(db, "alice@example.com", { full_name: "Alice Rao" });
  bob = await createUser(db, "bob@example.com", { full_name: "Bob Iyer" });
  admin = await createUser(db, "admin@example.com", { full_name: "Owner" });
  await makeAdmin(db, admin);
});

afterAll(async () => {
  await db.close();
});

beforeEach(async () => {
  await asSuperuser(db);
  await db.exec(`
    truncate order_status_history, order_items, payments, orders, admin_audit_log, products, categories, delivery_methods, serviceable_pincodes restart identity cascade;
    insert into categories (name, slug) values ('Sofas', 'sofas');
    insert into products (name, slug, sku, category_id, price_paise, discount_price_paise, stock)
      select 'Linen Sofa', 'linen-sofa', 'SOFA-1', id, 6899900, 5499900, 5 from categories where slug = 'sofas';
    insert into products (name, slug, sku, category_id, price_paise, stock)
      select 'Last Lamp', 'last-lamp', 'LAMP-1', id, 100000, 1 from categories where slug = 'sofas';
    insert into delivery_methods (code, name, price_paise, min_days, max_days, is_express)
      values ('standard', 'Standard Delivery', 0, 5, 7, false), ('express', 'Express Delivery', 49900, 2, 3, true);
    insert into serviceable_pincodes (pincode, city, state, standard_days, express_available, express_days)
      values ('411045', 'Pune', 'Maharashtra', 5, true, 2), ('560001', 'Bengaluru', 'Karnataka', 7, false, null);
  `);
});

describe("create_order", () => {
  it("prices from the database, snapshots the order and takes stock", async () => {
    const o = await place(alice, [{ product: "linen-sofa", quantity: 2 }], "express");
    expect(o.total_paise).toBe(5499900 * 2 + 49900);
    expect(o.order_number).toMatch(/^ORD-\d+$/);
    expect(await stockOf("linen-sofa")).toBe(3);

    await asSuperuser(db);
    const order = (
      await db.query<{ subtotal_paise: number; tax_paise: number; status: string; payment_status: string; shipping_address: { pincode: string } }>(
        "select subtotal_paise, tax_paise, status, payment_status, shipping_address from orders where id = $1",
        [o.order_id],
      )
    ).rows[0];
    expect(order).toMatchObject({ subtotal_paise: 10999800, status: "pending_payment", payment_status: "pending" });
    expect(order.tax_paise).toBe(Math.round((11049700 * 1800) / 11800));
    expect(order.shipping_address.pincode).toBe("411045");
    const items = (
      await db.query<{ product_name: string; unit_price_paise: number; line_total_paise: number }>(
        "select product_name, unit_price_paise, line_total_paise from order_items where order_id = $1",
        [o.order_id],
      )
    ).rows;
    expect(items).toEqual([{ product_name: "Linen Sofa", unit_price_paise: 5499900, line_total_paise: 10999800 }]);
    const history = (await db.query<{ status: string; note: string }>("select status, note from order_status_history where order_id = $1", [o.order_id])).rows;
    expect(history).toEqual([{ status: "pending_payment", note: "Order placed" }]);
  });

  it("uses the new price when the database price changes", async () => {
    await asSuperuser(db);
    await db.exec("update products set discount_price_paise = 4999900 where slug = 'linen-sofa'");
    const o = await place(alice, [{ product: "linen-sofa", quantity: 1 }]);
    expect(o.total_paise).toBe(4999900);
  });

  it("fails naming the item when stock is short, and changes nothing", async () => {
    await expect(place(alice, [{ product: "linen-sofa", quantity: 6 }])).rejects.toThrow(/Only 5 left of Linen Sofa/);
    expect(await stockOf("linen-sofa")).toBe(5);
    await asSuperuser(db);
    expect((await db.query("select 1 from orders")).rows).toHaveLength(0);
  });

  it("lets only one of two buyers take the last item", async () => {
    const first = await place(alice, [{ product: "last-lamp", quantity: 1 }]);
    expect(first.reused).toBe(false);
    await expect(place(bob, [{ product: "last-lamp", quantity: 1 }])).rejects.toThrow(/Last Lamp is out of stock/);
    expect(await stockOf("last-lamp")).toBe(0);
  });

  it("rejects unserviceable pincodes and Express where it is not offered", async () => {
    await expect(place(alice, [{ product: "linen-sofa", quantity: 1 }], "standard", { ...address, pincode: "999999" })).rejects.toThrow(/do not deliver/);
    await expect(place(alice, [{ product: "linen-sofa", quantity: 1 }], "express", { ...address, pincode: "560001" })).rejects.toThrow(/Express delivery is not available/);
    const ok = await place(alice, [{ product: "linen-sofa", quantity: 1 }], "standard", { ...address, pincode: "560001" });
    expect(ok.total_paise).toBe(5499900);
  });

  it("reuses an identical recent unpaid order instead of creating a duplicate", async () => {
    const a = await place(alice, [{ product: "linen-sofa", quantity: 1 }]);
    const b = await place(alice, [{ product: "linen-sofa", quantity: 1 }]);
    expect(b.order_id).toBe(a.order_id);
    expect(b.reused).toBe(true);
    expect(await stockOf("linen-sofa")).toBe(4);
  });

  it("requires login and valid input", async () => {
    await asAnon(db);
    await expect(db.query("select * from create_order('[]'::jsonb, 'standard', '{}'::jsonb)")).rejects.toThrow(/permission denied/);
    await expect(place(alice, [])).rejects.toThrow(/bag is empty/);
    await expect(place(alice, [{ product: "linen-sofa", quantity: 0 }])).rejects.toThrow(/between 1 and 10/);
    await expect(place(alice, [{ product: "nope", quantity: 1 }])).rejects.toThrow(/no longer available/);
    await expect(place(alice, [{ product: "linen-sofa", quantity: 1 }], "standard", { ...address, phone: "123" })).rejects.toThrow(/check your delivery address/);
  });

  it("customers cannot call the privileged order functions", async () => {
    const o = await place(alice, [{ product: "linen-sofa", quantity: 1 }]);
    const payId = await addPayment(o.order_id, alice);
    await asUser(db, alice);
    await expect(db.query("select mark_order_paid($1, null, 'upi', $2)", [payId, alice])).rejects.toThrow(/permission denied/);
    await expect(db.query("select admin_confirm_payment($1, $2)", [payId, alice])).rejects.toThrow(/permission denied/);
    await expect(db.query("select cancel_expired_orders()")).rejects.toThrow(/permission denied/);
  });
});

describe("payment confirmation", () => {
  it("mark_order_paid twice gives one confirmed order and no duplicate side effects", async () => {
    const o = await place(alice, [{ product: "linen-sofa", quantity: 2 }]);
    const payId = await addPayment(o.order_id, alice, "ORD-X", "cashfree", o.total_paise);
    await asServiceRole(db);
    const r1 = await db.query<{ r: string }>("select mark_order_paid($1, 'cf_1', 'upi', null) as r", [payId]);
    const r2 = await db.query<{ r: string }>("select mark_order_paid($1, 'cf_1', 'upi', null) as r", [payId]);
    expect([r1.rows[0].r, r2.rows[0].r]).toEqual(["paid", "already_paid"]);
    await asSuperuser(db);
    const order = (await db.query<{ status: string; payment_status: string }>("select status, payment_status from orders where id = $1", [o.order_id])).rows[0];
    expect(order).toEqual({ status: "confirmed", payment_status: "paid" });
    expect((await db.query("select 1 from order_status_history where order_id = $1 and status = 'confirmed'", [o.order_id])).rows).toHaveLength(1);
    expect((await db.query<{ sales_count: number }>("select sales_count from products where slug = 'linen-sofa'")).rows[0].sales_count).toBe(2);
  });

  it("UPI: submit reference, hold the order, owner confirms", async () => {
    const o = await place(alice, [{ product: "linen-sofa", quantity: 1 }]);
    const payId = await addPayment(o.order_id, alice, "FSREF1");
    await asServiceRole(db);
    expect((await db.query<{ r: string }>("select submit_upi_payment('FSREF1', $1, '123456789012') as r", [alice])).rows[0].r).toBe("submitted");
    expect((await db.query<{ r: string }>("select submit_upi_payment('FSREF1', $1, '123456789012') as r", [alice])).rows[0].r).toBe("already_submitted");
    await expect(db.query("select submit_upi_payment('FSREF1', $1, '999999999999')", [alice])).rejects.toThrow(/already submitted/);
    await expect(db.query("select submit_upi_payment('FSREF1', $1, '123456789012')", [bob])).rejects.toThrow(/Payment not found/);

    // The order no longer expires while the owner checks the bank statement.
    expect((await db.query<{ expires_at: string | null }>("select expires_at from orders where id = $1", [o.order_id])).rows[0].expires_at).toBeNull();
    expect((await db.query<{ n: number }>("select cancel_expired_orders() as n")).rows[0].n).toBe(0);

    await expect(db.query("select admin_confirm_payment($1, $2)", [payId, alice])).rejects.toThrow(/not allowed/);
    expect((await db.query<{ r: string }>("select admin_confirm_payment($1, $2) as r", [payId, admin])).rows[0].r).toBe("paid");
    const order = (await db.query<{ status: string }>("select status from orders where id = $1", [o.order_id])).rows[0];
    expect(order.status).toBe("confirmed");
    const audit = (await db.query<{ action: string }>("select action from admin_audit_log")).rows;
    expect(audit).toEqual([{ action: "payment.confirm" }]);
  });

  it("a UTR can back only one payment", async () => {
    const a = await place(alice, [{ product: "linen-sofa", quantity: 1 }]);
    const b = await place(bob, [{ product: "linen-sofa", quantity: 1 }]);
    await addPayment(a.order_id, alice, "FSA");
    await addPayment(b.order_id, bob, "FSB");
    await asServiceRole(db);
    await db.query("select submit_upi_payment('FSA', $1, '111111111111')", [alice]);
    await expect(db.query("select submit_upi_payment('FSB', $1, '111111111111')", [bob])).rejects.toThrow(/already been used/);
  });

  it("rejecting a payment lets the customer correct the reference", async () => {
    const o = await place(alice, [{ product: "linen-sofa", quantity: 1 }]);
    const payId = await addPayment(o.order_id, alice, "FSREF2");
    await asServiceRole(db);
    await db.query("select submit_upi_payment('FSREF2', $1, '222222222222')", [alice]);
    await db.query("select reject_upi_payment($1, $2, 'Amount does not match')", [payId, admin]);
    const pay = (await db.query<{ utr: string | null; failure_reason: string }>("select utr, failure_reason from payments where id = $1", [payId])).rows[0];
    expect(pay).toEqual({ utr: null, failure_reason: "Amount does not match" });
    expect((await db.query<{ expires_at: string | null }>("select expires_at from orders where id = $1", [o.order_id])).rows[0].expires_at).not.toBeNull();
    await db.query("select submit_upi_payment('FSREF2', $1, '333333333333')", [alice]);
  });

  it("money arriving for an expired order is flagged for review, not silently kept", async () => {
    const o = await place(alice, [{ product: "linen-sofa", quantity: 1 }]);
    const payId = await addPayment(o.order_id, alice, "ORD-LATE", "cashfree", o.total_paise);
    await asServiceRole(db);
    await db.query("update orders set expires_at = now() - interval '1 minute' where id = $1", [o.order_id]);
    await db.query("select cancel_expired_orders()");
    const r = await db.query<{ r: string }>("select mark_order_paid($1, 'cf_late', 'upi', null) as r", [payId]);
    expect(r.rows[0].r).toBe("needs_review");
    const order = (await db.query<{ status: string; needs_review: boolean }>("select status, needs_review from orders where id = $1", [o.order_id])).rows[0];
    expect(order).toEqual({ status: "cancelled", needs_review: true });
  });
});

describe("expiry and cancellation", () => {
  it("an expired unpaid order releases its stock exactly once", async () => {
    const o = await place(alice, [{ product: "linen-sofa", quantity: 3 }]);
    expect(await stockOf("linen-sofa")).toBe(2);
    await asServiceRole(db);
    await db.query("update orders set expires_at = now() - interval '1 minute' where id = $1", [o.order_id]);
    expect((await db.query<{ n: number }>("select cancel_expired_orders() as n")).rows[0].n).toBe(1);
    expect((await db.query<{ n: number }>("select cancel_expired_orders() as n")).rows[0].n).toBe(0);
    await db.query("select cancel_order($1, 'again', null)", [o.order_id]);
    expect(await stockOf("linen-sofa")).toBe(5);
    const order = (await db.query<{ status: string }>("select status from orders where id = $1", [o.order_id])).rows[0];
    expect(order.status).toBe("cancelled");
  });

  it("does not expire orders that are still inside the window", async () => {
    await place(alice, [{ product: "linen-sofa", quantity: 1 }]);
    await asServiceRole(db);
    expect((await db.query<{ n: number }>("select cancel_expired_orders() as n")).rows[0].n).toBe(0);
  });

  it("a shipped order cannot be cancelled", async () => {
    const o = await place(alice, [{ product: "linen-sofa", quantity: 1 }]);
    const payId = await addPayment(o.order_id, alice, "ORD-S", "cashfree", o.total_paise);
    await asServiceRole(db);
    await db.query("select mark_order_paid($1, 'cf', 'upi', null)", [payId]);
    for (const s of ["processing", "packed", "shipped"]) await db.query("select admin_set_order_status($1, $2, null, $3)", [o.order_id, s, admin]);
    await expect(db.query("select cancel_order($1, 'changed my mind', null)", [o.order_id])).rejects.toThrow(/already shipped/);
  });
});

describe("owner status changes", () => {
  it("walks legal transitions, records history and the audit log, and rejects illegal ones", async () => {
    const o = await place(alice, [{ product: "linen-sofa", quantity: 1 }]);
    const payId = await addPayment(o.order_id, alice, "ORD-T", "cashfree", o.total_paise);
    await asServiceRole(db);
    await db.query("select mark_order_paid($1, 'cf', 'upi', null)", [payId]);
    for (const s of ["processing", "packed", "shipped", "out_for_delivery", "delivered"]) {
      await db.query("select admin_set_order_status($1, $2, 'ok', $3)", [o.order_id, s, admin]);
    }
    await expect(db.query("select admin_set_order_status($1, 'packed', null, $2)", [o.order_id, admin])).rejects.toThrow(/illegal order status transition/);
    await expect(db.query("select admin_set_order_status($1, 'processing', null, $2)", [o.order_id, alice])).rejects.toThrow(/not allowed/);
    const history = (await db.query<{ status: string }>("select status from order_status_history where order_id = $1 order by created_at, id", [o.order_id])).rows.map((r) => r.status);
    expect(history).toEqual(["pending_payment", "confirmed", "processing", "packed", "shipped", "out_for_delivery", "delivered"]);
    expect((await db.query("select 1 from admin_audit_log where action = 'order.status'")).rows).toHaveLength(5);
  });

  it("cannot confirm an order without a payment", async () => {
    const o = await place(alice, [{ product: "linen-sofa", quantity: 1 }]);
    await asServiceRole(db);
    await expect(db.query("select admin_set_order_status($1, 'confirmed', null, $2)", [o.order_id, admin])).rejects.toThrow(/Confirm the payment/);
  });

  it("customers see only their own order timeline", async () => {
    const o = await place(alice, [{ product: "linen-sofa", quantity: 1 }]);
    await asUser(db, bob);
    expect((await db.query("select * from order_status_history where order_id = $1", [o.order_id])).rows).toHaveLength(0);
    await asUser(db, alice);
    expect((await db.query("select * from order_status_history where order_id = $1", [o.order_id])).rows).toHaveLength(1);
  });
});
