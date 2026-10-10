import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { confirmPaymentAction, rejectPaymentAction, setStatusAction, syncCashfreeAction } from "@/app/admin/actions";
import { StagePill, Timeline } from "@/components/orders/order-bits";
import { requireAdminPage } from "@/lib/auth/session";
import { adminGetOrder, NEXT_STATUSES, pendingUpiPayment } from "@/lib/data/orders";
import { orderStage } from "@/lib/data/types";
import { formatDateTime } from "@/lib/format-date";
import { formatPaise } from "@/lib/money";

const card = { background: "#F7F1E8", borderRadius: "6px", padding: "36px" } as const;

export default function AdminOrderPage({ params, searchParams }: PageProps<"/admin/orders/[orderNumber]">) {
  return (
    <Suspense fallback={null}>
      <Order params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Order({ params, searchParams }: Pick<PageProps<"/admin/orders/[orderNumber]">, "params" | "searchParams">) {
  await requireAdminPage();
  const { orderNumber } = await params;
  const sp = await searchParams;
  if (!/^ORD-[0-9]{3,12}$/.test(orderNumber)) notFound();
  const order = await adminGetOrder(orderNumber);
  if (!order) notFound();

  const stage = orderStage(order);
  const upi = pendingUpiPayment(order);
  const cashfreePending = order.status === "pending_payment" ? order.payments.find((p) => p.provider === "cashfree" && p.status === "pending") : undefined;
  const moves = NEXT_STATUSES[order.status] ?? [];
  const canCancel = ["pending_payment", "confirmed", "processing", "packed"].includes(order.status);
  const a = order.shipping_address;
  const done = typeof sp.done === "string" ? sp.done.slice(0, 200) : "";
  const error = typeof sp.error === "string" ? sp.error.slice(0, 200) : "";

  return (
    <>
      <span className="eyebrow">
        <Link href="/admin/orders" className="ulink" style={{ color: "#6A5C4F" }}>Orders</Link> / {order.order_number}
      </span>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "24px", flexWrap: "wrap", margin: "18px 0 48px" }}>
        <h1 className="serif" style={{ margin: "0", fontWeight: "300", fontSize: "clamp(48px, 6vw, 96px)", lineHeight: ".95", letterSpacing: "-.02em" }}>{order.order_number}</h1>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <StagePill label={stage.label} tone={stage.tone} />
          {order.needs_review && <StagePill label="Needs review" tone="bad" />}
        </div>
      </div>

      {done && <p role="status" style={{ margin: "0 0 24px", padding: "12px 16px", borderRadius: "6px", background: "#E3EBDD", color: "#35502B", fontSize: "14px" }}>{done}</p>}
      {error && <p role="alert" style={{ margin: "0 0 24px", padding: "12px 16px", borderRadius: "6px", background: "#F2DED3", color: "#8A2E1C", fontSize: "14px" }}>{error}</p>}
      {order.needs_review && order.review_reason && (
        <p role="alert" style={{ margin: "0 0 40px", padding: "16px 20px", borderRadius: "6px", border: "1px solid #8A2E1C", color: "#8A2E1C", fontSize: "15px", lineHeight: "1.6" }}>
          <strong>Needs your attention:</strong> {order.review_reason}
        </p>
      )}

      <div className="mg" style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: "24px", alignItems: "start" }}>
        <div style={{ gridColumn: "span 7", display: "flex", flexDirection: "column", gap: "56px" }}>
          {upi && upi.utr && (
            <div style={{ ...card, border: "1px solid #7B4E33" }}>
              <span className="eyebrow">Verify this UPI payment</span>
              <dl style={{ margin: "20px 0 0", display: "grid", gridTemplateColumns: "auto 1fr", gap: "10px 24px", fontSize: "15px" }}>
                <dt style={{ color: "#6A5C4F" }}>Amount to look for</dt><dd style={{ margin: "0", fontWeight: "600", fontSize: "20px" }}>{formatPaise(upi.amount_paise)}</dd>
                <dt style={{ color: "#6A5C4F" }}>Reference (UTR)</dt><dd style={{ margin: "0", fontWeight: "600", letterSpacing: ".06em" }}>{upi.utr}</dd>
                <dt style={{ color: "#6A5C4F" }}>Submitted</dt><dd style={{ margin: "0" }}>{upi.utr_submitted_at ? formatDateTime(upi.utr_submitted_at) : "—"}</dd>
              </dl>
              <p style={{ margin: "20px 0 24px", fontSize: "14px", lineHeight: "1.7", color: "#4F4338" }}>
                Open your bank app and find a credit of exactly this amount with this UTR. Only confirm when both match. If it does not appear, reject it with a reason and the customer can correct it.
              </p>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-start" }}>
                <form action={confirmPaymentAction}>
                  <input type="hidden" name="orderNumber" value={order.order_number} />
                  <input type="hidden" name="paymentId" value={upi.id} />
                  <button className="btn" type="submit">Payment received — confirm</button>
                </form>
                <form action={rejectPaymentAction} style={{ display: "flex", gap: "8px", flexWrap: "wrap", flex: "1 1 260px" }}>
                  <input type="hidden" name="orderNumber" value={order.order_number} />
                  <input type="hidden" name="paymentId" value={upi.id} />
                  <input className="field" name="reason" required minLength={3} maxLength={200} placeholder="Reason (shown to customer)" style={{ flex: "1 1 160px", minHeight: "50px", fontSize: "15px" }} />
                  <button className="btn btn-o" type="submit">Reject</button>
                </form>
              </div>
            </div>
          )}
          {upi && !upi.utr && (
            <div style={card}>
              <span className="eyebrow">Waiting for the customer</span>
              <p style={{ margin: "16px 0 0", fontSize: "15px", lineHeight: "1.7", color: "#4F4338" }}>
                The customer has not sent a UPI reference yet.{upi.failure_reason ? ` Last note sent to them: “${upi.failure_reason}”.` : ""}
                {order.expires_at ? ` The order is held until ${formatDateTime(order.expires_at)}.` : ""}
              </p>
            </div>
          )}
          {cashfreePending && (
            <div style={card}>
              <span className="eyebrow">Waiting for Cashfree</span>
              <p style={{ margin: "16px 0 24px", fontSize: "15px", lineHeight: "1.7", color: "#4F4338" }}>
                The customer has not completed payment yet. If they say they paid, ask Cashfree for the real status.
              </p>
              <form action={syncCashfreeAction}>
                <input type="hidden" name="orderNumber" value={order.order_number} />
                <button className="btn btn-o" type="submit">Check with Cashfree</button>
              </form>
            </div>
          )}

          {(moves.length > 0 || canCancel) && (
            <div style={card}>
              <span className="eyebrow">Update the order</span>
              <form action={setStatusAction} style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
                <input type="hidden" name="orderNumber" value={order.order_number} />
                <input type="hidden" name="orderId" value={order.id} />
                <label style={{ fontSize: "12px", letterSpacing: ".16em", textTransform: "uppercase", color: "#6A5C4F" }}>
                  Note for the customer (optional)
                  <input className="field" name="note" maxLength={300} placeholder="e.g. Courier: Delhivery, tracking 12345" style={{ marginTop: "8px", fontSize: "15px" }} />
                </label>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  {moves.map((m) => (
                    <button key={m.to} className="btn" type="submit" name="to" value={m.to}>{m.label}</button>
                  ))}
                  {canCancel && <button className="btn btn-o" type="submit" name="to" value="cancelled">Cancel order</button>}
                </div>
              </form>
            </div>
          )}

          <div>
            <span className="eyebrow">Tracking history</span>
            <div style={{ marginTop: "28px" }}><Timeline history={order.order_status_history} /></div>
          </div>

          <div>
            <span className="eyebrow">Items</span>
            <ul style={{ listStyle: "none", margin: "20px 0 0", padding: "0", borderTop: "1px solid #231E1A" }}>
              {order.order_items.map((i) => (
                <li key={i.id} style={{ display: "flex", justifyContent: "space-between", gap: "16px", padding: "18px 0", borderBottom: "1px solid rgba(35,30,26,.14)" }}>
                  <div>
                    <span className="serif" style={{ fontSize: "22px" }}>{i.product_name}</span>
                    <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#6A5C4F" }}>{i.quantity} × {formatPaise(i.unit_price_paise)}</p>
                  </div>
                  <span style={{ fontWeight: "600" }}>{formatPaise(i.line_total_paise)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside style={{ gridColumn: "9 / span 4", position: "sticky", top: "110px", display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={card}>
            <span className="eyebrow">Customer</span>
            <p style={{ margin: "16px 0 0", fontSize: "15px", lineHeight: "1.7" }}>
              <strong>{order.profiles?.full_name ?? a.full_name}</strong><br />
              {order.customer_email ?? "—"}<br />
              {a.phone}
            </p>
            <span className="eyebrow" style={{ display: "block", marginTop: "24px" }}>Deliver to</span>
            <p style={{ margin: "12px 0 0", fontSize: "14px", lineHeight: "1.7" }}>
              {a.full_name}<br />{a.house}, {a.street}<br />{a.city}, {a.state} {a.pincode}
            </p>
          </div>
          <div style={card}>
            <span className="eyebrow">Money</span>
            <dl style={{ margin: "20px 0 0", display: "flex", flexDirection: "column", gap: "12px", fontSize: "15px" }}>
              <Row label="Subtotal" value={formatPaise(order.subtotal_paise)} />
              <Row label={order.delivery_method_name} value={order.shipping_paise === 0 ? "Free" : formatPaise(order.shipping_paise)} />
              <Row label="GST included" value={formatPaise(order.tax_paise)} />
            </dl>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #231E1A" }}>
              <span className="eyebrow" style={{ color: "#231E1A" }}>Total</span>
              <span className="serif" style={{ fontSize: "36px", lineHeight: "1" }}>{formatPaise(order.total_paise)}</span>
            </div>
            <ul style={{ listStyle: "none", margin: "24px 0 0", padding: "0", fontSize: "13px", color: "#4F4338", lineHeight: "1.7" }}>
              {order.payments.map((p) => (
                <li key={p.id}>
                  {p.provider === "upi" ? "UPI QR" : p.provider === "cashfree" ? "Cashfree" : "Razorpay"} · {p.status}
                  {p.utr ? ` · UTR ${p.utr}` : ""}
                  {p.provider_payment_id && p.provider !== "upi" ? ` · ${p.provider_payment_id}` : ""}
                </li>
              ))}
            </ul>
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
