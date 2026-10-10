import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StagePill } from "@/components/orders/order-bits";
import { requireUserPage } from "@/lib/auth/session";
import { listMyOrders } from "@/lib/data/orders";
import { orderStage } from "@/lib/data/types";
import { formatDate } from "@/lib/format-date";
import { formatPaise } from "@/lib/money";

export const metadata: Metadata = { title: "My orders — Aurelle" };

export default function OrdersPage() {
  return (
    <main>
      <section style={{ padding: "150px 0 140px" }}>
        <div className="wrap" style={{ maxWidth: "1000px" }}>
          <span className="eyebrow fade">(01) — My orders</span>
          <h1 className="serif" style={{ margin: "18px 0 56px", fontWeight: "300", fontSize: "clamp(54px, 8vw, 120px)", lineHeight: ".92", letterSpacing: "-.02em" }}>
            <span className="rv"><span>Your</span></span>
            <span className="rv d1"><span><em style={{ color: "#7B4E33" }}>orders.</em></span></span>
          </h1>
          <Suspense fallback={<p className="eyebrow">Loading your orders…</p>}>
            <List />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

async function List() {
  await requireUserPage("/orders");
  const orders = await listMyOrders();

  if (orders.length === 0) {
    return (
      <div style={{ padding: "20px 0" }}>
        <p className="serif" style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: "300", margin: "0 0 12px" }}>
          Nothing here <em style={{ color: "#7B4E33" }}>yet.</em>
        </p>
        <p style={{ margin: "0 0 32px", color: "#6A5C4F" }}>When you place an order it will show up here, with live tracking.</p>
        <Link href="/shop" className="btn">Shop now</Link>
      </div>
    );
  }

  return (
    <ul style={{ listStyle: "none", margin: "0", padding: "0", borderTop: "1px solid #231E1A" }}>
      {orders.map((o) => {
        const stage = orderStage(o);
        const summary = o.order_items.map((i) => `${i.product_name}${i.quantity > 1 ? ` × ${i.quantity}` : ""}`).join(", ");
        return (
          <li key={o.id} style={{ borderBottom: "1px solid rgba(35,30,26,.14)" }}>
            <Link href={`/orders/${o.order_number}`} className="card" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "16px 32px", padding: "28px 0", textDecoration: "none", color: "#231E1A", alignItems: "center" }}>
              <div style={{ minWidth: "0" }}>
                <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
                  <span className="serif" style={{ fontSize: "28px" }}>{o.order_number}</span>
                  <StagePill label={stage.label} tone={stage.tone} />
                </div>
                <p style={{ margin: "8px 0 0", fontSize: "14px", color: "#6A5C4F", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{summary}</p>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#6A5C4F" }}>Placed {formatDate(o.created_at)}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "18px", fontWeight: "600" }}>{formatPaise(o.total_paise)}</div>
                <span className="eyebrow">View →</span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
