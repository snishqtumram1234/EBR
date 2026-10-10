import { logger } from "@/lib/logger";
import { syncCashfreePayment } from "@/lib/orders/service";
import { cashfreeSecretKey } from "@/lib/payments/cashfree";
import { verifyCashfreeWebhookSignature } from "@/lib/payments/signature";
import type { Json } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/webhooks/cashfree
 *
 * Verifies x-webhook-signature (base64 HMAC-SHA256 of timestamp + raw body,
 * keyed with the Cashfree secret key) BEFORE parsing, records the event in
 * webhook_events (unique event key, so retries are ignored), and for a
 * successful payment asks Cashfree for the real status before marking the
 * order paid. A webhook alone is never trusted as proof of payment.
 */
type CashfreeWebhook = {
  type?: string;
  event_time?: string;
  data?: {
    order?: { order_id?: string };
    payment?: { cf_payment_id?: string | number; payment_status?: string };
  };
};

const ok = () => Response.json({ ok: true });

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-webhook-signature");
  const timestamp = request.headers.get("x-webhook-timestamp");

  let secretKey: string;
  try {
    secretKey = cashfreeSecretKey();
  } catch {
    logger.error("cashfree_webhook.not_configured");
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "Not configured" } }, { status: 500 });
  }

  if (!verifyCashfreeWebhookSignature({ rawBody, timestamp, signature, secretKey })) {
    logger.warn("cashfree_webhook.signature_invalid");
    return Response.json({ error: { code: "SIGNATURE_INVALID", message: "Invalid signature" } }, { status: 400 });
  }

  let event: CashfreeWebhook;
  try {
    event = JSON.parse(rawBody) as CashfreeWebhook;
  } catch {
    return ok();
  }

  const orderNumber = event.data?.order?.order_id;
  const cfPaymentId = event.data?.payment?.cf_payment_id !== undefined ? String(event.data.payment.cf_payment_id) : undefined;
  const eventKey = `cashfree:${event.type}:${cfPaymentId ?? orderNumber}:${timestamp ?? event.event_time ?? ""}`;
  logger.info("cashfree_webhook.received", { type: event.type, orderNumber, cfPaymentId });

  try {
    const admin = createAdminClient();
    const { error: dupe } = await admin.from("webhook_events").insert({
      event_id: eventKey,
      event_type: event.type ?? "unknown",
      payload: event as unknown as Json,
    });
    if (dupe) {
      if (dupe.code !== "23505") throw dupe;
      // Seen before. Skip it only if it was fully processed; a failed attempt is retried.
      const { data: seen } = await admin.from("webhook_events").select("processed_at").eq("event_id", eventKey).maybeSingle();
      if ((seen as { processed_at: string | null } | null)?.processed_at) {
        logger.info("cashfree_webhook.duplicate_ignored", { eventKey });
        return Response.json({ ok: true, duplicate: true });
      }
    }

    if (event.type === "PAYMENT_SUCCESS_WEBHOOK" && orderNumber && /^ORD-[0-9]{3,12}$/.test(orderNumber)) {
      const result = await syncCashfreePayment(orderNumber, null);
      await admin.from("webhook_events").update({ processed_at: new Date().toISOString() }).eq("event_id", eventKey);
      logger.info("cashfree_webhook.processed", { orderNumber, result });
    } else {
      await admin.from("webhook_events").update({ processed_at: new Date().toISOString() }).eq("event_id", eventKey);
    }
    return ok();
  } catch (err) {
    // Ask Cashfree to retry: a payment event we could not apply must not be lost.
    logger.error("cashfree_webhook.handler_error", { type: event.type, orderNumber, err });
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "Could not process event" } }, { status: 500 });
  }
}
