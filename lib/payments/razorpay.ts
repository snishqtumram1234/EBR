import "server-only";
import { razorpayEnv, razorpayWebhookEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * Minimal Razorpay REST client (Orders and Payments APIs).
 * Docs: https://razorpay.com/docs/api/orders/ and /docs/api/payments/
 */

const API_BASE = "https://api.razorpay.com/v1";
const TIMEOUT_MS = 10_000;

export type RazorpayOrder = {
  id: string;
  entity: "order";
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string | null;
  status: "created" | "attempted" | "paid";
  notes: Record<string, string> | unknown[];
  created_at: number;
};

export type RazorpayPayment = {
  id: string;
  entity: "payment";
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  order_id: string | null;
  method: string;
  captured: boolean;
  error_code: string | null;
  error_description: string | null;
  error_reason: string | null;
  created_at: number;
};

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = razorpayEnv();
  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        authorization: `Basic ${auth}`,
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (err) {
    logger.error("razorpay.request_failed", { method, path, err });
    throw new AppError("PAYMENT_FAILED", "Payment service is unreachable. Please try again.");
  }

  const json = (await res.json().catch(() => null)) as
    | (T & { error?: never })
    | { error?: { code?: string; description?: string } }
    | null;

  if (!res.ok || !json) {
    const e = json && "error" in json ? json.error : undefined;
    // Razorpay error descriptions are safe to log; never log the auth header.
    logger.error("razorpay.api_error", { method, path, status: res.status, code: e?.code, description: e?.description });
    throw new AppError("PAYMENT_FAILED", "Payment service returned an error. Please try again.");
  }
  return json as T;
}

export function createRazorpayOrder(input: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  if (!Number.isSafeInteger(input.amountPaise) || input.amountPaise < 100) {
    // Razorpay's minimum is ₹1.
    throw new AppError("VALIDATION_ERROR", "Amount must be at least ₹1");
  }
  return call<RazorpayOrder>("POST", "/orders", {
    amount: input.amountPaise,
    currency: "INR",
    receipt: input.receipt.slice(0, 40),
    notes: input.notes,
  });
}

export function fetchRazorpayOrder(orderId: string): Promise<RazorpayOrder> {
  return call<RazorpayOrder>("GET", `/orders/${encodeURIComponent(orderId)}`);
}

export function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPayment> {
  return call<RazorpayPayment>("GET", `/payments/${encodeURIComponent(paymentId)}`);
}

/** Only the key id ever leaves the server. */
export function publicKeyId(): string {
  return razorpayEnv().RAZORPAY_KEY_ID;
}

export function keySecret(): string {
  return razorpayEnv().RAZORPAY_KEY_SECRET;
}

export function webhookSecret(): string {
  return razorpayWebhookEnv().RAZORPAY_WEBHOOK_SECRET;
}
