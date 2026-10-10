import "server-only";
import { AppError, toAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { verifyCashfreeOrder } from "@/lib/payments/cashfree";
import type { CheckoutInput } from "@/lib/payments/demo-checkout";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Order and payment orchestration. All money decisions happen in SQL
 * (create_order, mark_order_paid, ...); this layer only calls those functions
 * and talks to the gateway.
 */

export type PlacedOrder = {
  orderId: string;
  orderNumber: string;
  totalPaise: number;
  reused: boolean;
  expiresAt: Date | null;
};

/** Creates (or reuses) the pending order for the signed-in customer. Prices, stock and shipping come from the database. */
export async function placeOrder(input: CheckoutInput): Promise<PlacedOrder> {
  if (!input.customer || !input.address) {
    throw new AppError("VALIDATION_ERROR", "Add your contact and delivery details first");
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_order", {
    p_items: input.items.map((i) => ({ product: i.productId, quantity: i.quantity })),
    p_delivery_method: input.deliveryMethod,
    p_address: {
      full_name: input.customer.name,
      phone: input.customer.phone,
      house: input.address.house,
      street: input.address.street,
      city: input.address.city,
      state: input.address.state,
      pincode: input.address.pincode,
    },
  });
  if (error) throw toAppError(error);
  const row = (Array.isArray(data) ? data[0] : data) as
    | { order_id: string; order_number: string; total_paise: number; reused: boolean }
    | undefined;
  if (!row) throw new AppError("INTERNAL_ERROR", "Something went wrong. Please try again.");

  const { data: o } = await createAdminClient().from("orders").select("expires_at").eq("id", row.order_id).maybeSingle();
  const expiresAt = (o as { expires_at: string | null } | null)?.expires_at;

  logger.info("order.placed", { orderNumber: row.order_number, totalPaise: row.total_paise, reused: row.reused });
  return {
    orderId: row.order_id,
    orderNumber: row.order_number,
    totalPaise: row.total_paise,
    reused: row.reused,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  };
}

export type PaymentRecord = {
  id: string;
  providerOrderId: string;
  status: string;
  created: boolean;
};

/** One payment row per order and provider: returns the existing one when the order is reused. */
export async function ensurePayment(p: {
  orderId: string;
  userId: string;
  provider: "upi" | "cashfree";
  providerOrderId: string;
  amountPaise: number;
}): Promise<PaymentRecord> {
  const admin = createAdminClient();
  const find = async () => {
    const { data } = await admin
      .from("payments")
      .select("id, provider_order_id, status")
      .eq("order_id", p.orderId)
      .eq("provider", p.provider)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data as { id: string; provider_order_id: string; status: string } | null;
  };

  const existing = await find();
  if (existing) return { id: existing.id, providerOrderId: existing.provider_order_id, status: existing.status, created: false };

  const { data, error } = await admin
    .from("payments")
    .insert({
      order_id: p.orderId,
      user_id: p.userId,
      provider: p.provider,
      provider_order_id: p.providerOrderId,
      amount_paise: p.amountPaise,
    })
    .select("id, provider_order_id, status")
    .single();
  if (error) {
    const raced = await find(); // two requests at once: use the winner's row
    if (raced) return { id: raced.id, providerOrderId: raced.provider_order_id, status: raced.status, created: false };
    throw toAppError(error);
  }
  const row = data as { id: string; provider_order_id: string; status: string };
  return { id: row.id, providerOrderId: row.provider_order_id, status: row.status, created: true };
}

export async function submitUpiReference(reference: string, userId: string, utr: string): Promise<void> {
  const { error } = await createAdminClient().rpc("submit_upi_payment", { p_reference: reference, p_user: userId, p_utr: utr });
  if (error) throw toAppError(error);
  logger.info("payment.upi_submitted", { reference });
}

export type SyncResult = "paid" | "pending" | "failed" | "needs_review";

/**
 * Asks Cashfree whether the order is paid and, if so, marks it paid through
 * mark_order_paid (safe to call repeatedly, from the receipt page, the verify
 * route and the webhook). `userId` enforces ownership for customer calls;
 * the webhook passes null.
 */
export async function syncCashfreePayment(orderNumber: string, userId: string | null): Promise<SyncResult> {
  const admin = createAdminClient();
  let q = admin
    .from("payments")
    .select("id, user_id, status, amount_paise")
    .eq("provider", "cashfree")
    .eq("provider_order_id", orderNumber);
  if (userId) q = q.eq("user_id", userId);
  const { data, error } = await q.maybeSingle();
  if (error) throw toAppError(error);
  const pay = data as { id: string; user_id: string; status: string; amount_paise: number } | null;
  if (!pay) throw new AppError("NOT_FOUND", "Payment not found");
  if (pay.status === "paid") return "paid";

  const result = await verifyCashfreeOrder(orderNumber, pay.amount_paise);
  if (result.status === "pending") return "pending";
  if (result.status === "failed") {
    await admin.from("payments").update({ failure_reason: result.message.slice(0, 300) }).eq("id", pay.id).eq("status", "pending");
    return "failed";
  }

  const { data: outcome, error: markError } = await admin.rpc("mark_order_paid", {
    p_payment_id: pay.id,
    p_provider_payment_id: result.cfPaymentId,
    p_method: result.method,
    p_actor: null,
    p_raw: null,
  });
  if (markError) throw toAppError(markError);
  logger.info("payment.marked_paid", { orderNumber, cfPaymentId: result.cfPaymentId, outcome });
  return outcome === "needs_review" ? "needs_review" : "paid";
}
