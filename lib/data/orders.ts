import "server-only";
import { AppError, toAppError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { OrderDetail, OrderListItem, OrderRow, OrderStatus, PaymentRow } from "./types";

/**
 * Orders data layer. Pages call these functions and never query Supabase
 * directly. Customer functions run as the signed-in user, so row level
 * security guarantees they only ever see their own rows. Admin functions use
 * the service role and must only be called after requireAdmin().
 */

const ORDER_COLUMNS =
  "id, order_number, user_id, status, payment_status, subtotal_paise, discount_paise, shipping_paise, tax_paise, total_paise, delivery_method_name, expected_delivery_date, shipping_address, expires_at, needs_review, review_reason, created_at";

// ---------------------------------------------------------------------------
// Customer
// ---------------------------------------------------------------------------

export async function listMyOrders(): Promise<OrderListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(`${ORDER_COLUMNS}, order_items(product_name, product_slug, quantity), payments(provider, status, utr, utr_submitted_at)`)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw toAppError(error);
  return (data ?? []) as unknown as OrderListItem[];
}

export async function getMyOrder(orderNumber: string): Promise<OrderDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `${ORDER_COLUMNS}, order_items(id, product_name, product_slug, quantity, unit_price_paise, line_total_paise), order_status_history(id, status, note, created_at), payments(id, provider, provider_order_id, provider_payment_id, utr, utr_submitted_at, amount_paise, status, method, failure_reason, created_at)`,
    )
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (error) throw toAppError(error);
  if (!data) return null;
  const order = data as unknown as OrderDetail;
  order.order_status_history.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return order;
}

/** Customer cancels their own order (allowed until it ships). */
export async function cancelMyOrder(orderNumber: string, userId: string): Promise<void> {
  const order = await getMyOrder(orderNumber);
  if (!order || order.user_id !== userId) throw new AppError("NOT_FOUND", "Order not found");
  const admin = createAdminClient();
  const { error } = await admin.rpc("cancel_order", {
    p_order_id: order.id,
    p_reason: "Cancelled by the customer",
    p_actor: userId,
  });
  if (error) throw toAppError(error);
}

// ---------------------------------------------------------------------------
// Admin (service role: call only after requireAdmin())
// ---------------------------------------------------------------------------

export type AdminFilter = "all" | "awaiting" | "to_ship" | "shipped" | "done" | "cancelled" | "review";

const FILTERS: Record<AdminFilter, (q: ReturnType<typeof baseQuery>) => ReturnType<typeof baseQuery>> = {
  all: (q) => q,
  awaiting: (q) => q.eq("status", "pending_payment"),
  to_ship: (q) => q.in("status", ["confirmed", "processing", "packed"]),
  shipped: (q) => q.in("status", ["shipped", "out_for_delivery"]),
  done: (q) => q.in("status", ["delivered", "refunded"]),
  cancelled: (q) => q.eq("status", "cancelled"),
  review: (q) => q.eq("needs_review", true),
};

function baseQuery() {
  return createAdminClient()
    .from("orders")
    .select(`${ORDER_COLUMNS}, order_items(product_name, product_slug, quantity), payments(provider, status, utr, utr_submitted_at), profiles(full_name)`)
    .order("created_at", { ascending: false })
    .limit(200);
}

export type AdminOrderListItem = OrderListItem & { profiles: { full_name: string | null } | null };

export async function adminListOrders(filter: AdminFilter, search?: string): Promise<AdminOrderListItem[]> {
  let q = FILTERS[filter]?.(baseQuery()) ?? baseQuery();
  const term = search?.trim().toUpperCase();
  if (term && /^[A-Z0-9-]{3,20}$/.test(term)) q = q.ilike("order_number", `%${term}%`);
  const { data, error } = await q;
  if (error) throw toAppError(error);
  let rows = (data ?? []) as unknown as AdminOrderListItem[];
  // "Awaiting" is most useful with payments the customer has already submitted first.
  if (filter === "awaiting") {
    rows = [...rows].sort((a, b) => Number(!!b.payments?.some((p) => p.utr)) - Number(!!a.payments?.some((p) => p.utr)));
  }
  return rows;
}

export async function adminCounts(): Promise<Record<AdminFilter, number>> {
  const admin = createAdminClient();
  const count = async (apply: (q: ReturnType<typeof countQuery>) => ReturnType<typeof countQuery>) => {
    const { count: n, error } = await apply(countQuery());
    if (error) throw toAppError(error);
    return n ?? 0;
  };
  function countQuery() {
    return admin.from("orders").select("id", { count: "exact", head: true });
  }
  const [all, awaiting, toShip, shipped, done, cancelled, review] = await Promise.all([
    count((q) => q),
    count((q) => q.eq("status", "pending_payment")),
    count((q) => q.in("status", ["confirmed", "processing", "packed"])),
    count((q) => q.in("status", ["shipped", "out_for_delivery"])),
    count((q) => q.in("status", ["delivered", "refunded"])),
    count((q) => q.eq("status", "cancelled")),
    count((q) => q.eq("needs_review", true)),
  ]);
  return { all, awaiting, to_ship: toShip, shipped, done, cancelled, review };
}

export type AdminOrderDetail = OrderDetail & {
  profiles: { full_name: string | null; phone: string | null } | null;
  customer_email: string | null;
};

export async function adminGetOrder(orderNumber: string): Promise<AdminOrderDetail | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .select(
      `${ORDER_COLUMNS}, order_items(id, product_name, product_slug, quantity, unit_price_paise, line_total_paise), order_status_history(id, status, note, created_at), payments(id, provider, provider_order_id, provider_payment_id, utr, utr_submitted_at, amount_paise, status, method, failure_reason, created_at), profiles(full_name, phone)`,
    )
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (error) throw toAppError(error);
  if (!data) return null;
  const order = data as unknown as AdminOrderDetail;
  order.order_status_history.sort((a, b) => a.created_at.localeCompare(b.created_at));
  const { data: user } = await admin.auth.admin.getUserById(order.user_id);
  order.customer_email = user?.user?.email ?? null;
  return order;
}

// Next legal moves the owner can make from each status (mirrors is_valid_order_transition).
export const NEXT_STATUSES: Partial<Record<OrderStatus, { to: OrderStatus; label: string }[]>> = {
  confirmed: [{ to: "processing", label: "Start preparing" }],
  processing: [{ to: "packed", label: "Mark packed" }],
  packed: [{ to: "shipped", label: "Mark shipped" }],
  shipped: [
    { to: "out_for_delivery", label: "Out for delivery" },
    { to: "delivered", label: "Mark delivered" },
  ],
  out_for_delivery: [{ to: "delivered", label: "Mark delivered" }],
};

export function pendingUpiPayment<P extends Pick<PaymentRow, "provider" | "status">>(order: { payments: P[] }): P | null {
  return order.payments.find((p) => p.provider === "upi" && p.status === "pending") ?? null;
}

export type { OrderRow };
