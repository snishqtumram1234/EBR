import Link from "next/link";
import { StagePill } from "@/components/orders/order-bits";
import type { AdminOrderListItem } from "@/lib/data/orders";
import { orderStage } from "@/lib/data/types";
import { formatDateTime } from "@/lib/format-date";
import { formatPaise } from "@/lib/money";

/** One row per order, linking to the owner's order page. */
export function OrderTable({ orders, empty }: { orders: AdminOrderListItem[]; empty: string }) {
  if (orders.length === 0) {
    return <p style={{ margin: "0", padding: "28px 0", color: "#6A5C4F", borderTop: "1px solid #231E1A" }}>{empty}</p>;
  }
  return (
    <ul style={{ listStyle: "none", margin: "0", padding: "0", borderTop: "1px solid #231E1A" }}>
      {orders.map((o) => {
        const stage = orderStage(o);
        const verifying = o.status === "pending_payment" && o.payments.some((p) => p.provider === "upi" && p.utr);
        return (
          <li key={o.id} style={{ borderBottom: "1px solid rgba(35,30,26,.14)" }}>
            <Link href={`/admin/orders/${o.order_number}`} className="card" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "12px 32px", padding: "24px 0", textDecoration: "none", color: "#231E1A", alignItems: "center" }}>
              <div style={{ minWidth: "0" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                  <span className="serif" style={{ fontSize: "26px" }}>{o.order_number}</span>
                  <StagePill label={verifying ? "Verify payment" : stage.label} tone={verifying ? "wait" : stage.tone} />
                  {o.needs_review && <StagePill label="Needs review" tone="bad" />}
                </div>
                <p style={{ margin: "6px 0 0", fontSize: "14px", color: "#4F4338" }}>
                  {o.profiles?.full_name ?? o.shipping_address.full_name} · {o.order_items.map((i) => `${i.product_name}${i.quantity > 1 ? ` × ${i.quantity}` : ""}`).join(", ")}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#6A5C4F" }}>{formatDateTime(o.created_at)}</p>
              </div>
              <div style={{ textAlign: "right", fontWeight: "600", fontSize: "18px" }}>{formatPaise(o.total_paise)}</div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
