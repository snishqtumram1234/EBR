"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { toAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { syncCashfreePayment } from "@/lib/orders/service";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Owner actions. Each one: checks the caller is an admin (from the database,
 * never from the browser), validates input, then calls a SQL function that
 * re-checks the admin role, makes the change in one transaction and writes
 * the audit log.
 */

const orderNumber = z.string().regex(/^ORD-[0-9]{3,12}$/);
const uuid = z.string().uuid();
const note = z.string().trim().max(300).optional();

// The generated types treat optional SQL arguments as required strings; the functions accept NULL.
const NO_VALUE = null as unknown as string;

const STATUSES = ["processing", "packed", "shipped", "out_for_delivery", "delivered", "cancelled"] as const;

async function run(order: string, work: (adminId: string) => Promise<string>): Promise<never> {
  let done = "";
  let error = "";
  try {
    const admin = await requireAdmin();
    done = await work(admin.id);
  } catch (err) {
    error = toAppError(err).message;
    logger.warn("admin.action_failed", { order, error });
  }
  revalidatePath("/admin", "layout");
  revalidatePath(`/orders/${order}`);
  redirect(`/admin/orders/${order}?${error ? `error=${encodeURIComponent(error)}` : `done=${encodeURIComponent(done)}`}`);
}

function get(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v : undefined;
}

export async function confirmPaymentAction(formData: FormData): Promise<void> {
  const order = orderNumber.parse(get(formData, "orderNumber"));
  await run(order, async (adminId) => {
    const paymentId = uuid.parse(get(formData, "paymentId"));
    const { data, error } = await createAdminClient().rpc("admin_confirm_payment", { p_payment_id: paymentId, p_actor: adminId });
    if (error) throw error;
    logger.info("admin.payment_confirmed", { order, adminId, result: data });
    return data === "needs_review"
      ? "Payment recorded, but this order had already been cancelled. See the review note."
      : "Payment confirmed. The order is now confirmed.";
  });
}

export async function rejectPaymentAction(formData: FormData): Promise<void> {
  const order = orderNumber.parse(get(formData, "orderNumber"));
  await run(order, async (adminId) => {
    const paymentId = uuid.parse(get(formData, "paymentId"));
    const reason = z.string().trim().min(3, "Say why, so the customer can fix it").max(200).parse(get(formData, "reason"));
    const { error } = await createAdminClient().rpc("reject_upi_payment", { p_payment_id: paymentId, p_actor: adminId, p_reason: reason });
    if (error) throw error;
    return "Payment rejected. The customer can send a corrected reference.";
  });
}

export async function setStatusAction(formData: FormData): Promise<void> {
  const order = orderNumber.parse(get(formData, "orderNumber"));
  await run(order, async (adminId) => {
    const orderId = uuid.parse(get(formData, "orderId"));
    const to = z.enum(STATUSES).parse(get(formData, "to"));
    const text = note.parse(get(formData, "note") || undefined);
    const { error } = await createAdminClient().rpc("admin_set_order_status", { p_order_id: orderId, p_to: to, p_note: text ?? NO_VALUE, p_actor: adminId });
    if (error) throw error;
    return to === "cancelled" ? "Order cancelled and stock returned." : "Order updated.";
  });
}

/** Asks Cashfree for the real result (useful when the webhook cannot reach the server, e.g. on localhost). */
export async function syncCashfreeAction(formData: FormData): Promise<void> {
  const order = orderNumber.parse(get(formData, "orderNumber"));
  await run(order, async () => {
    const result = await syncCashfreePayment(order, null);
    return result === "pending" ? "Cashfree has not received the payment yet." : result === "failed" ? "Cashfree reports the payment did not go through." : "Payment confirmed by Cashfree.";
  });
}
