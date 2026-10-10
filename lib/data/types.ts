import type { Database } from "@/lib/database.types";

/**
 * Row shapes the UI relies on. They are written out by hand so pages keep
 * compiling whether `lib/database.types.ts` is the placeholder or the real
 * generated file.
 */
export type { Database };

export type OrderStatus =
  | "pending_payment"
  | "confirmed"
  | "processing"
  | "packed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "refunded";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "partially_refunded";

export type ShippingAddress = {
  full_name: string;
  phone: string;
  house: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
};

export type OrderItemRow = {
  id: string;
  product_name: string;
  product_slug: string;
  quantity: number;
  unit_price_paise: number;
  line_total_paise: number;
};

export type HistoryRow = {
  id: string;
  status: OrderStatus;
  note: string | null;
  created_at: string;
};

export type PaymentRow = {
  id: string;
  provider: "cashfree" | "razorpay" | "upi";
  provider_order_id: string;
  provider_payment_id: string | null;
  utr: string | null;
  utr_submitted_at: string | null;
  amount_paise: number;
  status: PaymentStatus;
  method: string | null;
  failure_reason: string | null;
  created_at: string;
};

export type OrderRow = {
  id: string;
  order_number: string;
  user_id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal_paise: number;
  discount_paise: number;
  shipping_paise: number;
  tax_paise: number;
  total_paise: number;
  delivery_method_name: string;
  expected_delivery_date: string | null;
  shipping_address: ShippingAddress;
  expires_at: string | null;
  needs_review: boolean;
  review_reason: string | null;
  created_at: string;
};

export type OrderDetail = OrderRow & {
  order_items: OrderItemRow[];
  order_status_history: HistoryRow[];
  payments: PaymentRow[];
};

export type OrderListItem = OrderRow & {
  order_items: Pick<OrderItemRow, "product_name" | "product_slug" | "quantity">[];
  payments: Pick<PaymentRow, "provider" | "status" | "utr" | "utr_submitted_at">[];
};

/** What the customer should see for an order, in plain words. */
export function orderStage(o: Pick<OrderRow, "status" | "payment_status"> & { payments?: Pick<PaymentRow, "provider" | "utr" | "status">[] }): {
  label: string;
  tone: "ok" | "wait" | "bad";
} {
  if (o.status === "cancelled") return { label: "Cancelled", tone: "bad" };
  if (o.status === "refunded") return { label: "Refunded", tone: "bad" };
  if (o.status === "pending_payment") {
    const upi = o.payments?.find((p) => p.provider === "upi");
    if (upi?.utr) return { label: "Verifying your payment", tone: "wait" };
    return { label: "Awaiting payment", tone: "wait" };
  }
  const labels: Record<string, string> = {
    confirmed: "Confirmed",
    processing: "Being prepared",
    packed: "Packed",
    shipped: "Shipped",
    out_for_delivery: "Out for delivery",
    delivered: "Delivered",
  };
  return { label: labels[o.status] ?? o.status, tone: "ok" };
}
