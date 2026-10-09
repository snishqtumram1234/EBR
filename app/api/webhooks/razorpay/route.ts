import { logger } from "@/lib/logger";
import { webhookSecret } from "@/lib/payments/razorpay";
import { verifyWebhookSignature } from "@/lib/payments/signature";

/**
 * POST /api/webhooks/razorpay
 *
 * Verifies the X-Razorpay-Signature header against the RAW body before
 * parsing anything, deduplicates by x-razorpay-event-id, handles the events
 * we care about, and always answers 200 quickly for valid requests so
 * Razorpay does not retry.
 *
 * Interim (pre-database) version: events are verified and logged, and
 * deduplication is in memory (per server instance, lost on restart). Once the
 * database is connected, event ids go to webhook_events (unique) and handlers
 * call mark_order_paid / record failures / update refunds.
 */

const seenEventIds = new Set<string>();
const MAX_SEEN = 5000;

type WebhookEvent = {
  event?: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string; amount?: number; method?: string; error_reason?: string | null } };
    order?: { entity?: { id?: string; amount_paid?: number; receipt?: string | null } };
    refund?: { entity?: { id?: string; payment_id?: string; amount?: number; status?: string } };
  };
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  const eventId = request.headers.get("x-razorpay-event-id");

  let secret: string;
  try {
    secret = webhookSecret();
  } catch {
    logger.error("webhook.not_configured");
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "Not configured" } }, { status: 500 });
  }

  if (!verifyWebhookSignature({ rawBody, signature, webhookSecret: secret })) {
    logger.warn("webhook.signature_invalid", { eventId });
    return Response.json(
      { error: { code: "SIGNATURE_INVALID", message: "Invalid signature" } },
      { status: 400 },
    );
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(rawBody) as WebhookEvent;
  } catch {
    logger.warn("webhook.body_not_json", { eventId });
    return Response.json({ ok: true });
  }

  if (eventId) {
    if (seenEventIds.has(eventId)) {
      logger.info("webhook.duplicate_ignored", { eventId, type: event.event });
      return Response.json({ ok: true, duplicate: true });
    }
    if (seenEventIds.size >= MAX_SEEN) seenEventIds.clear();
    seenEventIds.add(eventId);
  }

  try {
    handleEvent(eventId, event);
  } catch (err) {
    // Never fail the webhook for our own processing errors; log for follow-up.
    logger.error("webhook.handler_error", { eventId, type: event.event, err });
  }
  return Response.json({ ok: true });
}

function handleEvent(eventId: string | null, event: WebhookEvent) {
  const payment = event.payload?.payment?.entity;
  const order = event.payload?.order?.entity;
  const refund = event.payload?.refund?.entity;

  switch (event.event) {
    case "payment.captured":
      logger.info("webhook.payment_captured", {
        eventId,
        razorpayOrderId: payment?.order_id,
        razorpayPaymentId: payment?.id,
        amountPaise: payment?.amount,
        method: payment?.method,
      });
      break;
    case "payment.failed":
      logger.info("webhook.payment_failed", {
        eventId,
        razorpayOrderId: payment?.order_id,
        razorpayPaymentId: payment?.id,
        reason: payment?.error_reason,
      });
      break;
    case "order.paid":
      logger.info("webhook.order_paid", {
        eventId,
        razorpayOrderId: order?.id,
        receipt: order?.receipt,
        amountPaidPaise: order?.amount_paid,
        razorpayPaymentId: payment?.id,
      });
      break;
    case "refund.processed":
    case "refund.failed":
      logger.info(`webhook.${event.event.replace(".", "_")}`, {
        eventId,
        razorpayRefundId: refund?.id,
        razorpayPaymentId: refund?.payment_id,
        amountPaise: refund?.amount,
        status: refund?.status,
      });
      break;
    default:
      logger.info("webhook.unhandled_event", { eventId, type: event.event });
  }
}
