import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyCashfreeWebhookSignature, verifyCheckoutSignature, verifyWebhookSignature } from "@/lib/payments/signature";

const KEY_SECRET = "test_key_secret_123";
const WEBHOOK_SECRET = "test_webhook_secret_456";
const sign = (msg: string, secret: string) => createHmac("sha256", secret).update(msg).digest("hex");

describe("checkout signature", () => {
  const orderId = "order_ABC123";
  const paymentId = "pay_XYZ789";
  const valid = sign(`${orderId}|${paymentId}`, KEY_SECRET);

  it("accepts a valid signature", () => {
    expect(verifyCheckoutSignature({ orderId, paymentId, signature: valid, keySecret: KEY_SECRET })).toBe(true);
  });

  it("rejects a tampered signature", () => {
    const tampered = (valid[0] === "a" ? "b" : "a") + valid.slice(1);
    expect(verifyCheckoutSignature({ orderId, paymentId, signature: tampered, keySecret: KEY_SECRET })).toBe(false);
  });

  it("rejects a signature for a different payment or order", () => {
    expect(verifyCheckoutSignature({ orderId, paymentId: "pay_OTHER", signature: valid, keySecret: KEY_SECRET })).toBe(false);
    expect(verifyCheckoutSignature({ orderId: "order_OTHER", paymentId, signature: valid, keySecret: KEY_SECRET })).toBe(false);
  });

  it("rejects a signature made with the wrong secret", () => {
    const wrong = sign(`${orderId}|${paymentId}`, "not_the_secret");
    expect(verifyCheckoutSignature({ orderId, paymentId, signature: wrong, keySecret: KEY_SECRET })).toBe(false);
  });

  it("rejects missing, empty, short and non-hex signatures", () => {
    for (const signature of [undefined, null, "", "abc", "z".repeat(64), valid.slice(0, 63)]) {
      expect(verifyCheckoutSignature({ orderId, paymentId, signature, keySecret: KEY_SECRET })).toBe(false);
    }
  });

  it("rejects when the secret is missing", () => {
    expect(verifyCheckoutSignature({ orderId, paymentId, signature: valid, keySecret: "" })).toBe(false);
  });
});

describe("webhook signature", () => {
  const rawBody = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_1", amount: 100 } } } });
  const valid = sign(rawBody, WEBHOOK_SECRET);

  it("accepts a valid signature over the raw body", () => {
    expect(verifyWebhookSignature({ rawBody, signature: valid, webhookSecret: WEBHOOK_SECRET })).toBe(true);
  });

  it("rejects a tampered body (e.g. amount changed)", () => {
    const tamperedBody = rawBody.replace('"amount":100', '"amount":1');
    expect(verifyWebhookSignature({ rawBody: tamperedBody, signature: valid, webhookSecret: WEBHOOK_SECRET })).toBe(false);
  });

  it("rejects a re-serialised body even if semantically equal", () => {
    const reserialised = JSON.stringify(JSON.parse(rawBody), null, 2);
    expect(verifyWebhookSignature({ rawBody: reserialised, signature: valid, webhookSecret: WEBHOOK_SECRET })).toBe(false);
  });

  it("rejects missing and malformed signatures", () => {
    for (const signature of [undefined, null, "", "not-hex", valid.toUpperCase().slice(2)]) {
      expect(verifyWebhookSignature({ rawBody, signature, webhookSecret: WEBHOOK_SECRET })).toBe(false);
    }
  });

  it("rejects a signature made with the checkout key secret instead of the webhook secret", () => {
    const wrong = sign(rawBody, KEY_SECRET);
    expect(verifyWebhookSignature({ rawBody, signature: wrong, webhookSecret: WEBHOOK_SECRET })).toBe(false);
  });
});

describe("cashfree webhook signature", () => {
  const SECRET = "cf_test_secret";
  const rawBody = JSON.stringify({ type: "PAYMENT_SUCCESS_WEBHOOK", data: { order: { order_id: "FS_1" }, payment: { payment_amount: 1 } } });
  const timestamp = "1760000000000";
  const valid = createHmac("sha256", SECRET).update(timestamp + rawBody).digest("base64");

  it("accepts a valid signature over timestamp + raw body", () => {
    expect(verifyCashfreeWebhookSignature({ rawBody, timestamp, signature: valid, secretKey: SECRET })).toBe(true);
  });

  it("rejects a changed body, changed timestamp or wrong secret", () => {
    expect(verifyCashfreeWebhookSignature({ rawBody: rawBody.replace('"payment_amount":1', '"payment_amount":9'), timestamp, signature: valid, secretKey: SECRET })).toBe(false);
    expect(verifyCashfreeWebhookSignature({ rawBody, timestamp: "1760000000001", signature: valid, secretKey: SECRET })).toBe(false);
    expect(verifyCashfreeWebhookSignature({ rawBody, timestamp, signature: valid, secretKey: "other" })).toBe(false);
  });

  it("rejects missing or malformed signatures and timestamps", () => {
    for (const signature of [undefined, null, "", "***", valid.slice(4)]) {
      expect(verifyCashfreeWebhookSignature({ rawBody, timestamp, signature, secretKey: SECRET })).toBe(false);
    }
    expect(verifyCashfreeWebhookSignature({ rawBody, timestamp: null, signature: valid, secretKey: SECRET })).toBe(false);
  });
});
