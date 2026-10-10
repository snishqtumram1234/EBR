// End-to-end check of the order flow against the hosted Supabase project in .env.local.
//   npm run test:integration
// Creates temporary test accounts and orders, checks what customers can and cannot do,
// then deletes everything it created and restores product stock. Do not run it against
// a live shop while real customers are ordering.
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
config({ path: ".env.local", quiet: true });

const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin;
const pub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const secret = process.env.SUPABASE_SECRET_KEY!;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, secret, opts);

const stamp = Date.now().toString(36);
const results: [string, boolean, string?][] = [];
const check = (name: string, ok: boolean, detail?: string) => {
  results.push([name, ok, detail]);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail && !ok ? "  -> " + detail : ""}`);
};

const address = { full_name: "Test Customer", phone: "9876543210", house: "Flat 1", street: "Baner Road", city: "Pune", state: "Maharashtra", pincode: "411045" };
const items = (slug: string, quantity: number) => [{ product: slug, quantity }];

async function makeUser(label: string) {
  const email = `e2e.${label}.${stamp}@example.com`;
  const password = `Tmp-${stamp}-pass!`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `E2E ${label}` } });
  if (error) throw new Error(`createUser ${label}: ${error.message}`);
  const client = createClient(url, pub, opts);
  const { error: signErr } = await client.auth.signInWithPassword({ email, password });
  if (signErr) throw new Error(`signIn ${label}: ${signErr.message}`);
  return { id: data.user.id, client };
}

const stock = async (slug: string) => ((await admin.from("products").select("stock").eq("slug", slug).single()).data as { stock: number }).stock;

const created: { users: string[]; orders: string[] } = { users: [], orders: [] };
const originalStock: Record<string, number> = {};

async function main() {
  const alice = await makeUser("alice");
  const bob = await makeUser("bob");
  const owner = await makeUser("owner");
  created.users.push(alice.id, bob.id, owner.id);
  await admin.from("profiles").update({ role: "admin" }).eq("id", owner.id);

  const sofa = "linen-cloud-sofa";
  originalStock[sofa] = await stock(sofa);
  originalStock["test-item-one-rupee"] = await stock("test-item-one-rupee");

  // ---- profile trigger and role safety ----
  const { data: prof } = await alice.client.from("profiles").select("role, full_name").eq("id", alice.id).single();
  check("signup created a customer profile", (prof as { role: string } | null)?.role === "customer");
  const { error: roleErr } = await alice.client.from("profiles").update({ role: "admin" }).eq("id", alice.id);
  check("customer cannot make themselves admin", !!roleErr, roleErr ? undefined : "update succeeded");

  // ---- placing an order ----
  const { data: placed, error: placeErr } = await alice.client.rpc("create_order", { p_items: items(sofa, 2), p_delivery_method: "express", p_address: address });
  const order = (placed as { order_id: string; order_number: string; total_paise: number; reused: boolean }[] | null)?.[0];
  check("create_order works for a logged-in customer", !!order && !placeErr, placeErr?.message);
  if (!order) throw new Error("cannot continue without an order");
  created.orders.push(order.order_id);
  check("total is database price x2 plus Express delivery", order.total_paise === 5499900 * 2 + 49900, `got ${order.total_paise}`);
  check("order number format", /^ORD-\d+$/.test(order.order_number), order.order_number);
  check("stock reduced by 2", (await stock(sofa)) === originalStock[sofa] - 2, `${await stock(sofa)}`);

  const again = await alice.client.rpc("create_order", { p_items: items(sofa, 2), p_delivery_method: "express", p_address: address });
  check("identical retry reuses the order (no duplicate, no double stock)", (again.data as { order_id: string; reused: boolean }[])?.[0]?.order_id === order.order_id && (await stock(sofa)) === originalStock[sofa] - 2);

  // Last-item behaviour: leave exactly one sideboard in stock.
  const board = "cane-arch-sideboard";
  originalStock[board] = await stock(board);
  await admin.from("products").update({ stock: 1 }).eq("slug", board);
  const tooMany = await alice.client.rpc("create_order", { p_items: items(board, 2), p_delivery_method: "standard", p_address: address });
  check("asking for more than is left names the item", /Only 1 left of Cane Arch Sideboard/.test(tooMany.error?.message ?? ""), tooMany.error?.message);
  const first = await alice.client.rpc("create_order", { p_items: items(board, 1), p_delivery_method: "standard", p_address: { ...address, house: "Flat 9" } });
  const firstRow = (first.data as { order_id: string }[] | null)?.[0];
  if (firstRow) created.orders.push(firstRow.order_id);
  check("the last item can be bought", !!firstRow && (await stock(board)) === 0, first.error?.message);
  const second = await bob.client.rpc("create_order", { p_items: items(board, 1), p_delivery_method: "standard", p_address: address });
  check("a second buyer cannot get the same last item", /out of stock/.test(second.error?.message ?? ""), second.error?.message);
  const badPin = await alice.client.rpc("create_order", { p_items: items("round-oak-coffee-table", 1), p_delivery_method: "standard", p_address: { ...address, pincode: "999999" } });
  check("unserviceable pincode refused", /do not deliver/.test(badPin.error?.message ?? ""), badPin.error?.message);
  const bengaluruExpress = await alice.client.rpc("create_order", { p_items: items("round-oak-coffee-table", 1), p_delivery_method: "express", p_address: { ...address, pincode: "560001" } });
  check("Express refused outside Pune", /Express delivery is not available/.test(bengaluruExpress.error?.message ?? ""), bengaluruExpress.error?.message);

  // ---- customer isolation and write protection ----
  const bobOrders = await bob.client.from("orders").select("id");
  check("another customer cannot see the order", (bobOrders.data ?? []).length === 0);
  const aliceOrders = await alice.client.from("orders").select("id");
  check("owner of the order can see it", (aliceOrders.data ?? []).some((o: { id: string }) => o.id === order.order_id));
  const hack = await alice.client.from("orders").update({ payment_status: "paid", status: "confirmed" }).eq("id", order.order_id).select("id");
  check("customer cannot mark an order paid", !!hack.error || (hack.data ?? []).length === 0, JSON.stringify(hack.data));
  const priceHack = await alice.client.from("products").update({ price_paise: 100 }).eq("slug", sofa).select("id");
  check("customer cannot change a price", !!priceHack.error || (priceHack.data ?? []).length === 0);
  const rpcHack = await alice.client.rpc("mark_order_paid", { p_payment_id: order.order_id, p_provider_payment_id: "x", p_method: "upi", p_actor: alice.id });
  check("customer cannot call mark_order_paid", !!rpcHack.error, "call succeeded");
  const couponRead = await alice.client.from("coupons").select("code");
  check("customer cannot read coupons", (couponRead.data ?? []).length === 0);
  const anon = createClient(url, pub, opts);
  const anonOrders = await anon.from("orders").select("id");
  check("anonymous visitor sees no orders", !!anonOrders.error || (anonOrders.data ?? []).length === 0);
  const anonProducts = await anon.from("products").select("slug").limit(20);
  check("anonymous visitor can browse active products", (anonProducts.data ?? []).length >= 10);
  const anonOrderRpc = await anon.rpc("create_order", { p_items: items(sofa, 1), p_delivery_method: "standard", p_address: address });
  check("anonymous visitor cannot place an order", !!anonOrderRpc.error);

  // ---- UPI payment: customer submits UTR, owner confirms ----
  const { data: payRow, error: payErr } = await admin.from("payments").insert({ order_id: order.order_id, user_id: alice.id, provider: "upi", provider_order_id: `FSE2E${stamp.toUpperCase()}`, amount_paise: order.total_paise }).select("id").single();
  check("payment row recorded by the server", !!payRow && !payErr, payErr?.message);
  const payId = (payRow as { id: string }).id;
  const utr = String(Math.floor(1e11 + Math.random() * 9e11));
  const sub = await admin.rpc("submit_upi_payment", { p_reference: `FSE2E${stamp.toUpperCase()}`, p_user: alice.id, p_utr: utr });
  check("customer submits a UTR", sub.data === "submitted", sub.error?.message);
  const held = (await admin.from("orders").select("expires_at, status").eq("id", order.order_id).single()).data as { expires_at: string | null; status: string };
  check("order stops expiring while owner verifies", held.expires_at === null && held.status === "pending_payment");
  const expiredNow = await admin.rpc("cancel_expired_orders");
  check("expiry job leaves a UTR-submitted order alone", (await stock(sofa)) === originalStock[sofa] - 2, JSON.stringify(expiredNow.data));

  const notOwner = await admin.rpc("admin_confirm_payment", { p_payment_id: payId, p_actor: alice.id });
  check("a customer id cannot confirm payments", !!notOwner.error && /not allowed/.test(notOwner.error.message), notOwner.error?.message);
  const asCustomer = await alice.client.rpc("admin_confirm_payment", { p_payment_id: payId, p_actor: owner.id });
  check("customers cannot call the owner function at all", !!asCustomer.error);
  const confirm = await admin.rpc("admin_confirm_payment", { p_payment_id: payId, p_actor: owner.id });
  check("owner confirms the payment", confirm.data === "paid", confirm.error?.message);
  const confirmAgain = await admin.rpc("admin_confirm_payment", { p_payment_id: payId, p_actor: owner.id });
  check("confirming twice is harmless", confirmAgain.data === "already_paid", confirmAgain.error?.message);
  const paid = (await admin.from("orders").select("status, payment_status").eq("id", order.order_id).single()).data as { status: string; payment_status: string };
  check("order is confirmed and paid", paid.status === "confirmed" && paid.payment_status === "paid", JSON.stringify(paid));

  const hist1 = await alice.client.from("order_status_history").select("status, note").eq("order_id", order.order_id).order("created_at");
  const statuses = (hist1.data as { status: string }[]).map((h) => h.status);
  check("customer sees their tracking timeline", statuses.includes("confirmed") && statuses[0] === "pending_payment", statuses.join(","));

  // ---- owner moves the order along; illegal moves refused ----
  for (const s of ["processing", "packed", "shipped"]) {
    const r = await admin.rpc("admin_set_order_status", { p_order_id: order.order_id, p_to: s, p_note: s === "shipped" ? "Courier: test" : (null as unknown as string), p_actor: owner.id });
    check(`owner can move to ${s}`, !r.error, r.error?.message);
  }
  const back = await admin.rpc("admin_set_order_status", { p_order_id: order.order_id, p_to: "packed", p_note: null as unknown as string, p_actor: owner.id });
  check("cannot move backwards (shipped -> packed)", !!back.error && /illegal order status transition/.test(back.error.message), back.error?.message);
  const cancelShipped = await admin.rpc("cancel_order", { p_order_id: order.order_id, p_reason: "late", p_actor: alice.id });
  check("a shipped order cannot be cancelled", !!cancelShipped.error && /already shipped/.test(cancelShipped.error.message), cancelShipped.error?.message);
  const audit = await admin.from("admin_audit_log").select("action").eq("actor_id", owner.id);
  check("owner actions are audit-logged", (audit.data ?? []).length >= 4, String((audit.data ?? []).length));

  // ---- expiry returns stock ----
  const lamp = "test-item-one-rupee";
  const o2 = (await bob.client.rpc("create_order", { p_items: items(lamp, 3), p_delivery_method: "standard", p_address: address })).data as { order_id: string }[];
  created.orders.push(o2[0].order_id);
  check("second customer's order reserved 3 test items", (await stock(lamp)) === originalStock[lamp] - 3);
  await admin.from("orders").update({ expires_at: new Date(Date.now() - 60000).toISOString() }).eq("id", o2[0].order_id);
  const exp = await admin.rpc("cancel_expired_orders");
  check("expiry job cancels the unpaid order", typeof exp.data === "number" && exp.data >= 1, JSON.stringify(exp));
  check("expiry returned the stock exactly once", (await stock(lamp)) === originalStock[lamp]);
  const exp2 = await admin.rpc("cancel_expired_orders");
  check("running the job again changes nothing", exp2.data === 0 && (await stock(lamp)) === originalStock[lamp], JSON.stringify(exp2.data));
  const cronJob = await admin.from("webhook_events").select("id").limit(1);
  check("webhook_events table reachable by the server only", !cronJob.error);
  const cronAnon = await anon.from("webhook_events").select("id");
  check("webhook_events closed to visitors", !!cronAnon.error || (cronAnon.data ?? []).length === 0);
}

async function cleanup() {
  // Remove everything the test created and restore stock.
  for (const id of created.orders) {
    await admin.from("payments").delete().eq("order_id", id);
    await admin.from("orders").delete().eq("id", id);
  }
  await admin.from("admin_audit_log").delete().in("actor_id", created.users);
  for (const [slug, s] of Object.entries(originalStock)) {
    await admin.from("products").update({ stock: s, sales_count: 0 }).eq("slug", slug);
  }
  for (const id of created.users) await admin.auth.admin.deleteUser(id);
}

main()
  .catch((e) => {
    console.error("E2E crashed:", e instanceof Error ? e.message : e);
    results.push(["crash", false]);
  })
  .finally(async () => {
    await cleanup();
    const failed = results.filter(([, ok]) => !ok).length;
    console.log(`\n${results.length - failed}/${results.length} checks passed. Test accounts and orders removed, stock restored.`);
    process.exit(failed ? 1 : 0);
  });
