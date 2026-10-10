import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cancelOrderAction } from "@/app/orders/actions";
import { ClearCartWhenPlaced } from "@/components/orders/clear-cart";
import { StagePill, Timeline } from "@/components/orders/order-bits";
import { UpiReferenceForm } from "@/components/orders/upi-reference-form";
import { requireUserPage } from "@/lib/auth/session";
import { getMyOrder } from "@/lib/data/orders";
import { orderStage } from "@/lib/data/types";
import { formatDate, formatDateTime } from "@/lib/format-date";
import { formatPaise } from "@/lib/money";

export const metadata: Metadata = { title: "Order — Aurelle" };

const CANCELLABLE = ["pending_payment", "confirmed", "processing", "packed"];

export default function OrderPage({ params, searchParams }: PageProps<"/orders/[orderNumber]">) {
  return (
    <main>
      <section style={{ padding: "150px 0 140px" }}>
        <div className="wrap">
          <Suspense fallback={<p className="eyebrow">Loading your order…</p>}>
            <Order params={params} searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

async function Order({ params, searchParams }: Pick<PageProps<"/orders/[orderNumber]">, "params" | "searchParams">) {
  const { orderNumber } = await params;
  const sp = await searchParams;
  if (!/^ORD-[0-9]{3,12}$/.test(orderNumber)) notFound();
  await requireUserPage(`/orders/${orderNumber}`);

  const order = await getMyOrder(orderNumber);
  if (!order) notFound();

  const stage = orderStage(order);
  const upi = order.payments.find((p) => p.provider === "upi");
  const placed = sp.placed === "1";
  const error = typeof sp.error === "string" ? sp.error.slice(0, 200) : "";
  const awaitingReference = order.status === "pending_payment" && upi && upi.status === "pending" && !upi.utr;
  const awaitingOwner = order.status === "pending_payment" && upi?.utr;
  const awaitingGateway = order.status === "pending_payment" && !upi;

  let heading: [string, string];
  if (order.status === "cancelled") heading = ["Order", "cancelled."];
  else if (order.status === "delivered") heading = ["Delivered.", "Enjoy your home."];
  else if (awaitingOwner) heading = ["We're verifying", "your payment."];
  else if (order.status === "pending_payment") heading = ["Complete", "your payment."];
  else if (placed) heading = ["Thank you.", "It's on its way home."];
  else heading = ["Your", "order."];

  const a = order.shipping_address;
  const clearCart = placed && order.status !== "cancelled" && (order.status !== "pending_payment" || Boolean(awaitingOwner));

  return (
    <>
      {clearCart && <ClearCartWhenPlaced />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "24px", flexWrap: "wrap", marginBottom: "72px", position: "relative", paddingBottom: "18px" }}>
        <div>
          <span className="eyebrow fade">
            <Link href="/orders" className="ulink" style={{ color: "#6A5C4F" }}>My orders</Link> / {order.order_number}
          </span>
          <h1 className="serif" style={{ margin: "18px 0 0", fontWeight: "300", fontSize: "clamp(48px, 7vw, 112px)", lineHeight: ".92", letterSpacing: "-.02em" }}>
            <span className="rv"><span>{heading[0]}</span></span>
            <span className="rv d1"><span><em style={{ color: "#7B4E33" }}>{heading[1]}</em></span></span>
          </h1>
        </div>
        <div className="fade d2" style={{ textAlign: "right" }}>
          <StagePill label={stage.label} tone={stage.tone} />
          {order.expected_delivery_date && order.status !== "cancelled" && order.status !== "pending_payment" && (
            <p style={{ margin: "12px 0 0", fontSize: "14px", color: "#6A5C4F" }}>Expected by {formatDate(order.expected_delivery_date)}</p>
          )}
        </div>
        <span className="line d2" style={{ position: "absolute", left: "0", right: "0", bottom: "0", height: "1px", background: "rgba(35,30,26,.2)" }} />
      </div>

      {error && (
        <p role="alert" style={{ margin: "0 0 40px", padding: "12px 16px", borderRadius: "6px", background: "#F2DED3", color: "#8A2E1C", fontSize: "14px" }}>{error}</p>
      )}

      <div className="mg" style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: "24px", alignItems: "start" }}>
        <div style={{ gridColumn: "span 7", display: "flex", flexDirection: "column", gap: "88px" }}>
          {awaitingReference && upi && (
            <div style={{ background: "#F7F1E8", borderRadius: "6px", padding: "40px 36px" }}>
              <span className="eyebrow">Your UPI payment</span>
              <p style={{ margin: "16px 0 24px", fontSize: "15px", lineHeight: "1.7", color: "#4F4338" }}>
                Paid {formatPaise(upi.amount_paise)} by UPI? Send us the 12-digit reference (UTR) from your app and we&apos;ll confirm it.{" "}
                {order.expires_at && <>We&apos;re holding your items until {formatDateTime(order.expires_at)}. </>}
                Haven&apos;t paid yet? <Link href="/checkout" className="ulink" style={{ color: "#231E1A" }}>Show the QR again</Link>.
              </p>
              <UpiReferenceForm reference={upi.provider_order_id} rejectedReason={upi.failure_reason} />
            </div>
          )}
          {awaitingOwner && (
            <div style={{ background: "#F7F1E8", borderRadius: "6px", padding: "40px 36px" }}>
              <span className="eyebrow">Payment submitted</span>
              <p style={{ margin: "16px 0 0", fontSize: "15px", lineHeight: "1.7", color: "#4F4338" }}>
                We received your reference <strong>{upi?.utr}</strong> and are matching it with our bank statement. Your order is confirmed as soon as it matches. This page updates when it does.
              </p>
            </div>
          )}
          {awaitingGateway && (
            <div style={{ background: "#F7F1E8", borderRadius: "6px", padding: "40px 36px" }}>
              <span className="eyebrow">Payment pending</span>
              <p style={{ margin: "16px 0 24px", fontSize: "15px", lineHeight: "1.7", color: "#4F4338" }}>
                We haven&apos;t received your payment yet.
                {order.expires_at && <> We&apos;re holding your items until {formatDateTime(order.expires_at)}.</>}
              </p>
              <Link href="/checkout" className="btn">Complete payment</Link>
            </div>
          )}

          <div>
            <span className="eyebrow">Tracking</span>
            <h2 className="serif" style={{ margin: "14px 0 32px", fontWeight: "300", fontSize: "clamp(32px, 3vw, 44px)", lineHeight: "1" }}>Where it is.</h2>
            <Timeline history={order.order_status_history} />
          </div>

          <div>
            <span className="eyebrow">Items</span>
            <ul style={{ listStyle: "none", margin: "20px 0 0", padding: "0", borderTop: "1px solid #231E1A" }}>
              {order.order_items.map((i) => (
                <li key={i.id} style={{ display: "flex", justifyContent: "space-between", gap: "16px", padding: "20px 0", borderBottom: "1px solid rgba(35,30,26,.14)" }}>
                  <div>
                    <Link href={`/product/${i.product_slug}`} className="serif" style={{ fontSize: "24px", color: "#231E1A", textDecoration: "none" }}>{i.product_name}</Link>
                    <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#6A5C4F" }}>{i.quantity} × {formatPaise(i.unit_price_paise)}</p>
                  </div>
                  <span style={{ fontWeight: "600" }}>{formatPaise(i.line_total_paise)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside style={{ gridColumn: "9 / span 4", position: "sticky", top: "110px" }}>
          <div style={{ background: "#F7F1E8", borderRadius: "6px", padding: "40px 36px" }}>
            <span className="eyebrow">Summary</span>
            <dl style={{ margin: "24px 0 0", display: "flex", flexDirection: "column", gap: "14px", fontSize: "15px" }}>
              <Row label="Subtotal" value={formatPaise(order.subtotal_paise)} />
              <Row label={order.delivery_method_name} value={order.shipping_paise === 0 ? "Free" : formatPaise(order.shipping_paise)} />
            </dl>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px", marginTop: "24px", paddingTop: "24px", borderTop: "1px solid #231E1A" }}>
              <span className="eyebrow" style={{ color: "#231E1A" }}>{order.payment_status === "paid" ? "Total paid" : "Total"}</span>
              <span className="serif" style={{ fontSize: "40px", lineHeight: "1" }}>{formatPaise(order.total_paise)}</span>
            </div>
            <p style={{ margin: "8px 0 0", textAlign: "right", fontSize: "12px", color: "#6A5C4F" }}>Includes GST (18%) of {formatPaise(order.tax_paise)}</p>

            <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid rgba(35,30,26,.2)" }}>
              <span className="eyebrow">Delivering to</span>
              <p style={{ margin: "12px 0 0", fontSize: "14px", lineHeight: "1.7" }}>
                {a.full_name}<br />{a.house}, {a.street}<br />{a.city}, {a.state} {a.pincode}<br />{a.phone}
              </p>
            </div>

            {order.payments[0] && (
              <div style={{ marginTop: "24px" }}>
                <span className="eyebrow">Payment</span>
                <p style={{ margin: "12px 0 0", fontSize: "14px", lineHeight: "1.7" }}>
                  {order.payments[0].provider === "upi" ? "UPI QR" : "Cashfree"} · {order.payment_status === "paid" ? "Paid" : "Pending"}
                  {order.payments[0].utr && <><br />Reference {order.payments[0].utr}</>}
                </p>
              </div>
            )}

            {CANCELLABLE.includes(order.status) && (
              <form action={cancelOrderAction} style={{ marginTop: "32px" }}>
                <input type="hidden" name="orderNumber" value={order.order_number} />
                <button type="submit" className="btn btn-o" style={{ width: "100%" }}>Cancel order</button>
                {order.payment_status === "paid" && (
                  <p style={{ margin: "12px 0 0", fontSize: "12px", color: "#6A5C4F", lineHeight: "1.6" }}>This order is paid. If you cancel, the store will refund you.</p>
                )}
              </form>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
      <dt style={{ color: "#6A5C4F" }}>{label}</dt>
      <dd style={{ margin: "0", fontWeight: "500" }}>{value}</dd>
    </div>
  );
}
