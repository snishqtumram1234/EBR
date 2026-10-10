import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Razorpay signature checks. Pure functions: the secret is passed in, so they
 * can be unit tested and never read env themselves.
 */

function hmacHex(message: string, secret: string): string {
  return createHmac("sha256", secret).update(message, "utf8").digest("hex");
}

/** Constant-time comparison of two hex strings. False on any length/format mismatch. */
function safeEqualHex(expectedHex: string, receivedHex: string): boolean {
  if (!/^[0-9a-f]+$/i.test(receivedHex)) return false;
  const a = Buffer.from(expectedHex, "hex");
  const b = Buffer.from(receivedHex, "hex");
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Cashfree webhook signature: base64 HMAC-SHA256 of (timestamp + RAW body)
 * keyed with the Cashfree secret key. Headers: x-webhook-signature and
 * x-webhook-timestamp. Must run before the body is parsed.
 */
export function verifyCashfreeWebhookSignature(params: {
  rawBody: string;
  timestamp: string | null | undefined;
  signature: string | null | undefined;
  secretKey: string;
}): boolean {
  const { rawBody, timestamp, signature, secretKey } = params;
  if (!rawBody || !timestamp || !signature || !secretKey) return false;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(signature)) return false;
  const expected = createHmac("sha256", secretKey).update(timestamp + rawBody, "utf8").digest();
  const received = Buffer.from(signature, "base64");
  if (received.length !== expected.length) return false;
  return timingSafeEqual(expected, received);
}

/**
 * Checkout signature: HMAC-SHA256 of "<order_id>|<payment_id>" with the key
 * secret. `orderId` must come from our server, not from the browser response.
 */
export function verifyCheckoutSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string | null | undefined;
  keySecret: string;
}): boolean {
  const { orderId, paymentId, signature, keySecret } = params;
  if (!orderId || !paymentId || !signature || !keySecret) return false;
  return safeEqualHex(hmacHex(`${orderId}|${paymentId}`, keySecret), signature);
}

/**
 * Webhook signature: HMAC-SHA256 of the RAW request body with the webhook
 * secret. Must run before the body is parsed.
 */
export function verifyWebhookSignature(params: {
  rawBody: string;
  signature: string | null | undefined;
  webhookSecret: string;
}): boolean {
  const { rawBody, signature, webhookSecret } = params;
  if (!rawBody || !signature || !webhookSecret) return false;
  return safeEqualHex(hmacHex(rawBody, webhookSecret), signature);
}
