import { logger } from "@/lib/logger";
import { cashfreeSecretKey } from "@/lib/payments/cashfree";
import { verifyCashfreeWebhookSignature } from "@/lib/payments/signature";

/**
 * POST /api/webhooks/cashfree
 *
 * Verifies x-webhook-signature (base64 HMAC-SHA256 of timestamp + raw body,
 * keyed with the Cashfree secret key) before parsing, deduplicates, logs the
 * event and answers 200 quickly.
 *
 * Interim (pre-database) version: deduplication is in memory and events are
 * only logged. Once the database is connected, events are stored in
 * webhook_events and successful payments call mark_order_paid.
 */

const seen = new Set<string>();
const MAX_SEEN = 5000;

type CashfreeWebhook = {
  type?: string;
  data?: {
    order?: { order_id?: string; order_amount?: number };
    payment?: {
      cf_payment_id?: string | number;
      payment_status?: string;
      payment_amount?: number;
      payment_group?: string;
      payment_message?: string;
    };
  };
};

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
    return Response.json({ ok: true });
  }

  const orderId = event.data?.order?.order_id;
  const payment = event.data?.payment;
  const dedupeKey = `${event.type}:${orderId}:${payment?.cf_payment_id}`;
  if (seen.has(dedupeKey)) {
    logger.info("cashfree_webhook.duplicate_ignored", { type: event.type, orderId });
    return Response.json({ ok: true, duplicate: true });
  }
  if (seen.size >= MAX_SEEN) seen.clear();
  seen.add(dedupeKey);

  logger.info("cashfree_webhook.received", {
    type: event.type,
    orderId,
    cfPaymentId: payment?.cf_payment_id !== undefined ? String(payment.cf_payment_id) : undefined,
    paymentStatus: payment?.payment_status,
    amountRupees: payment?.payment_amount,
    method: payment?.payment_group,
  });
  return Response.json({ ok: true });
}
