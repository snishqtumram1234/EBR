import "server-only";
import { randomUUID } from "node:crypto";
import { cashfreeEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * Minimal Cashfree Payment Gateway (PG) REST client.
 * Docs: https://www.cashfree.com/docs/api-reference/payments/latest/orders/create
 *
 * Cashfree amounts are RUPEES with up to two decimals. We keep paise
 * everywhere else and convert only at this boundary.
 */

const API_VERSION = "2026-01-01";
const TIMEOUT_MS = 10_000;

export type CashfreeOrder = {
  cf_order_id: string;
  order_id: string;
  order_amount: number;
  order_currency: string;
  order_status: "ACTIVE" | "PAID" | "EXPIRED" | "TERMINATION_REQUESTED" | "TERMINATED";
  payment_session_id: string;
  created_at?: string;
  order_note?: string | null;
  order_tags?: Record<string, string> | null;
  customer_details?: {
    customer_id?: string;
    customer_name?: string | null;
    customer_phone?: string;
    customer_email?: string | null;
  } | null;
};

export type CashfreePayment = {
  cf_payment_id: string | number;
  order_id: string;
  payment_status: "SUCCESS" | "NOT_ATTEMPTED" | "FAILED" | "USER_DROPPED" | "VOID" | "CANCELLED" | "PENDING";
  payment_amount: number;
  payment_currency: string;
  payment_group: string | null; // e.g. "upi", "credit_card", "net_banking"
  payment_message: string | null;
};

function baseUrl(): string {
  return cashfreeEnv().CASHFREE_ENV === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
}

export function cashfreeMode(): "sandbox" | "production" {
  return cashfreeEnv().CASHFREE_ENV;
}

export function cashfreeSecretKey(): string {
  return cashfreeEnv().CASHFREE_SECRET_KEY;
}

export function paiseToRupees(paise: number): number {
  if (!Number.isSafeInteger(paise) || paise < 100) {
    throw new AppError("VALIDATION_ERROR", "Amount must be at least ₹1");
  }
  return Number((paise / 100).toFixed(2));
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const env = cashfreeEnv();
  let res: Response;
  try {
    res = await fetch(`${baseUrl()}${path}`, {
      method,
      headers: {
        "x-client-id": env.CASHFREE_APP_ID,
        "x-client-secret": env.CASHFREE_SECRET_KEY,
        "x-api-version": API_VERSION,
        "x-request-id": randomUUID(),
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (err) {
    logger.error("cashfree.request_failed", { method, path, err });
    throw new AppError("PAYMENT_FAILED", "Payment service is unreachable. Please try again.");
  }

  const json = (await res.json().catch(() => null)) as T | { message?: string; code?: string; type?: string } | null;
  if (!res.ok || !json) {
    const e = json as { message?: string; code?: string; type?: string } | null;
    logger.error("cashfree.api_error", { method, path, status: res.status, code: e?.code, type: e?.type, description: e?.message });
    throw new AppError("PAYMENT_FAILED", "Payment service returned an error. Please try again.");
  }
  return json as T;
}

/**
 * Cashfree rejects order_tags containing non-ASCII characters (e.g. "₹"),
 * so tag values are reduced to printable ASCII. Tags are informational only.
 */
export function sanitizeTags(tags: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(tags).map(([k, v]) => [
      k,
      v.replace(/₹/g, "Rs ").replace(/[^ -~]/g, "").replace(/\s+/g, " ").trim().slice(0, 255),
    ]),
  );
}

export function createCashfreeOrder(input: {
  orderId: string;
  amountPaise: number;
  customer: { id: string; phone: string; name?: string; email?: string };
  returnUrl: string;
  note?: string;
  /** Cashfree blocks payment after this time (must be 15 minutes to 30 days ahead). */
  expiresAt?: Date;
  /** Small string key/values kept on the Cashfree order (max 10; values up to 255 chars). */
  tags?: Record<string, string>;
}): Promise<CashfreeOrder> {
  return call<CashfreeOrder>("POST", "/orders", {
    order_id: input.orderId,
    order_amount: paiseToRupees(input.amountPaise),
    order_currency: "INR",
    customer_details: {
      customer_id: input.customer.id,
      customer_phone: input.customer.phone,
      customer_name: input.customer.name,
      customer_email: input.customer.email,
    },
    order_meta: { return_url: input.returnUrl },
    order_expiry_time: input.expiresAt ? input.expiresAt.toISOString() : undefined,
    order_note: input.note,
    order_tags: input.tags ? sanitizeTags(input.tags) : undefined,
  });
}

export function fetchCashfreeOrder(orderId: string): Promise<CashfreeOrder> {
  return call<CashfreeOrder>("GET", `/orders/${encodeURIComponent(orderId)}`);
}

/**
 * Server-side truth about a Cashfree order: paid only if Cashfree says the
 * order is PAID and a successful INR payment covers the full order amount.
 */
export type CashfreeVerification =
  | { status: "paid"; order: CashfreeOrder; amountPaise: number; method: string | null; cfPaymentId: string }
  | { status: "pending"; order: CashfreeOrder }
  | { status: "failed"; order: CashfreeOrder; message: string };

export async function verifyCashfreeOrder(orderId: string, expectedAmountPaise?: number): Promise<CashfreeVerification> {
  const [order, payments] = await Promise.all([fetchCashfreeOrder(orderId), fetchCashfreePayments(orderId)]);
  const orderPaise = rupeesToPaise(order.order_amount);
  if (expectedAmountPaise !== undefined && orderPaise !== expectedAmountPaise) {
    // Cashfree's order does not match what our database says the customer owes.
    logger.warn("payment.cashfree_expected_amount_mismatch", { orderId, expectedAmountPaise, orderPaise });
    return { status: "failed", order, message: "Payment amount does not match the order" };
  }
  const success = payments.find((p) => p.payment_status === "SUCCESS");

  if (order.order_status === "PAID" && success) {
    const paidPaise = rupeesToPaise(success.payment_amount);
    if (paidPaise !== orderPaise || success.payment_currency !== "INR") {
      logger.warn("payment.cashfree_amount_mismatch", { orderId, orderPaise, paidPaise });
      return { status: "failed", order, message: "Payment amount does not match the order" };
    }
    logger.info("payment.cashfree_verified", {
      orderId,
      cfPaymentId: String(success.cf_payment_id),
      amountPaise: paidPaise,
      method: success.payment_group,
    });
    return { status: "paid", order, amountPaise: paidPaise, method: success.payment_group, cfPaymentId: String(success.cf_payment_id) };
  }

  const latest = payments[0];
  if (order.order_status === "ACTIVE" && (!latest || latest.payment_status === "PENDING")) {
    return { status: "pending", order };
  }
  logger.info("payment.cashfree_not_paid", { orderId, orderStatus: order.order_status, paymentStatus: latest?.payment_status });
  return { status: "failed", order, message: latest?.payment_message || "Payment was not completed. You can try again." };
}

export function fetchCashfreePayments(orderId: string): Promise<CashfreePayment[]> {
  return call<CashfreePayment[]>("GET", `/orders/${encodeURIComponent(orderId)}/payments`);
}
