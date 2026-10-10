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

export function createCashfreeOrder(input: {
  orderId: string;
  amountPaise: number;
  customer: { id: string; phone: string; name?: string; email?: string };
  returnUrl: string;
  note?: string;
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
    order_note: input.note,
  });
}

export function fetchCashfreeOrder(orderId: string): Promise<CashfreeOrder> {
  return call<CashfreeOrder>("GET", `/orders/${encodeURIComponent(orderId)}`);
}

export function fetchCashfreePayments(orderId: string): Promise<CashfreePayment[]> {
  return call<CashfreePayment[]>("GET", `/orders/${encodeURIComponent(orderId)}/payments`);
}
