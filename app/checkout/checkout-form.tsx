"use client";
/* eslint-disable @next/next/no-img-element -- product thumbnails use the design's fixed crops */

import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Stepper } from "@/components/product/stepper";
import { useStore } from "@/components/store/store-provider";
import { formatRupees } from "@/lib/catalog/format";
import { findProduct } from "@/lib/catalog/products";
import { formatPaise } from "@/lib/money";
import { computeTotals } from "@/lib/pricing/totals";
import { expressAvailable, type DEMO_DELIVERY, type DeliveryMethod } from "@/lib/pricing/delivery";

type ApiError = { error: { code: string; message: string } };

type PayMethod = "cashfree" | "upi";

type UpiRequest = {
  reference: string;
  amount: number;
  payeeName: string;
  upiId: string;
  upiLink: string;
  qrDataUrl: string;
};

const STATES = [
  "Andhra Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
  "Odisha", "Puducherry", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

const labelStyle = { display: "block", fontSize: "12px", letterSpacing: ".16em", textTransform: "uppercase", color: "#6A5C4F" } as const;
const h2Style = { margin: "0 0 28px", fontWeight: "300", fontSize: "clamp(32px, 3vw, 44px)", lineHeight: "1" } as const;

export function CheckoutForm({ delivery, gstRateBps }: { delivery: typeof DEMO_DELIVERY; gstRateBps: number }) {
  const router = useRouter();
  const store = useStore();
  const [method, setMethod] = useState<DeliveryMethod>("standard");
  const [form, setForm] = useState({ name: "", phone: "", email: "", house: "", street: "", city: "Pune", state: "Maharashtra", pincode: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod>("upi");
  const [upi, setUpi] = useState<UpiRequest | null>(null);
  const [utr, setUtr] = useState("");
  const [submittedUtr, setSubmittedUtr] = useState<{ reference: string; utr: string; amount: number } | null>(null);

  const lines = useMemo(
    () =>
      store.cart
        .map((l) => ({ ...l, product: findProduct(l.productId) }))
        .filter((l): l is typeof l & { product: NonNullable<typeof l.product> } => !!l.product),
    [store.cart],
  );

  const canExpress = form.pincode.length === 6 && expressAvailable(form.pincode);
  const chosenMethod: DeliveryMethod = method === "express" && form.pincode.length === 6 && !canExpress ? "standard" : method;

  // Display only: the server prices everything again before charging.
  const totals = useMemo(
    () =>
      computeTotals({
        lines: lines.map((l) => ({ unitPricePaise: l.product.pricePaise, quantity: l.quantity })),
        shippingPaise: lines.length ? delivery[chosenMethod].pricePaise : 0,
        gstRateBps,
      }),
    [lines, delivery, chosenMethod, gstRateBps],
  );
  const savings = lines.reduce((s, l) => s + (l.product.mrpPaise - l.product.pricePaise) * l.quantity, 0);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const payload = () => ({
    items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
    deliveryMethod: chosenMethod,
    customer: { name: form.name, phone: form.phone, email: form.email },
    address: { house: form.house, street: form.street, city: form.city, state: form.state, pincode: form.pincode },
  });

  async function startUpi() {
    setBusy(true);
    try {
      const res = await fetch("/api/payment/upi/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const data = (await res.json()) as UpiRequest | ApiError;
      if (!res.ok || "error" in data) {
        setError("error" in data ? data.error.message : "Could not start UPI payment. Please try again.");
      } else {
        setUpi(data);
        setUtr("");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setBusy(false);
  }

  async function submitUtr() {
    if (!upi) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/payment/upi/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reference: upi.reference, utr }),
      });
      const data = (await res.json()) as { status: string } | ApiError;
      if (!res.ok || "error" in data) {
        setError("error" in data ? data.error.message : "Could not submit. Please try again.");
      } else {
        setSubmittedUtr({ reference: upi.reference, utr, amount: upi.amount });
        setUpi(null);
        store.clearCart();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setBusy(false);
  }

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (payMethod === "upi") {
      await startUpi();
      return;
    }
    if (!window.Cashfree) {
      setError("The payment window is still loading. Please try again in a moment.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/payment/cashfree/create-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const data = (await res.json()) as
        | { orderId: string; paymentSessionId: string; mode: "sandbox" | "production"; amount: number }
        | ApiError;
      if (!res.ok || "error" in data) {
        setError("error" in data ? data.error.message : "Could not start payment. Please try again.");
        setBusy(false);
        return;
      }
      const result = await window.Cashfree({ mode: data.mode }).checkout({
        paymentSessionId: data.paymentSessionId,
        redirectTarget: "_modal",
      });
      if (result.redirect) return; // Cashfree navigates to the confirmation page itself.
      // Paid, failed or closed: the confirmation page asks Cashfree for the real status.
      router.push(`/checkout/success?order_id=${encodeURIComponent(data.orderId)}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  if (submittedUtr) {
    return (
      <div style={{ padding: "40px 0 20px", textAlign: "center" }}>
        <span className="eyebrow">Order {submittedUtr.reference}</span>
        <p className="serif" style={{ fontSize: "clamp(40px, 5vw, 72px)", fontWeight: "300", margin: "18px 0 14px", lineHeight: ".95" }}>
          Thank you. <em style={{ color: "#7B4E33" }}>We&apos;re checking your payment.</em>
        </p>
        <p style={{ maxWidth: "520px", margin: "0 auto 36px", fontSize: "16px", lineHeight: "1.7", color: "#6A5C4F" }}>
          You paid {formatPaise(submittedUtr.amount)} by UPI (reference {submittedUtr.utr}). We confirm UPI payments against our bank statement, then your order is confirmed.
        </p>
        <Link href="/shop" className="btn">Continue shopping</Link>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div style={{ padding: "40px 0 20px", textAlign: "center" }}>
        <p className="serif" style={{ fontSize: "clamp(36px, 4vw, 56px)", fontWeight: "300", margin: "0 0 14px" }}>
          Your bag is <em style={{ color: "#7B4E33" }}>empty.</em>
        </p>
        <p style={{ margin: "0 0 36px", fontSize: "15px", color: "#6A5C4F" }}>Find something you&apos;ll live with for years.</p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/shop" className="btn">Shop now</Link>
          <button type="button" className="btn btn-o" onClick={() => store.add("test-item-one-rupee", "Payment test item")}>
            Add ₹1 test item
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={pay} className="mg" style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: "24px", alignItems: "start" }}>
      <Script src="https://sdk.cashfree.com/js/v3/cashfree.js" strategy="afterInteractive" />

      <div style={{ gridColumn: "span 7", display: "flex", flexDirection: "column", gap: "88px" }}>
        {/* Bag */}
        <ul style={{ listStyle: "none", margin: "0", padding: "0", borderTop: "1px solid #231E1A" }}>
          {lines.map((l) => (
            <li key={l.productId} style={{ display: "flex", gap: "20px", padding: "24px 0", borderBottom: "1px solid rgba(35,30,26,.14)", alignItems: "center" }}>
              <div className="card" style={{ flex: "none", width: "96px", aspectRatio: "4 / 5", borderRadius: "4px", overflow: "hidden", background: l.product.bg }}>
                <div className="zoomh" style={{ width: "100%", height: "100%" }}><img decoding="async" src={l.product.image} alt={l.product.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /></div>
              </div>
              <div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "6px" }}>
                {l.product.hidden ? (
                  <span className="serif" style={{ fontSize: "26px", lineHeight: "1.1" }}>{l.product.name}</span>
                ) : (
                  <Link href={`/product/${l.productId}`} className="serif" style={{ fontSize: "26px", lineHeight: "1.1", color: "#231E1A", textDecoration: "none" }}>{l.product.name}</Link>
                )}
                <span style={{ fontSize: "13px", color: "#6A5C4F" }}>{l.product.material}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "10px", flexWrap: "wrap" }}>
                  <Stepper value={l.quantity} onChange={(n) => store.setQuantity(l.productId, n)} label={l.product.name} />
                  <button type="button" className="ulink" onClick={() => store.remove(l.productId)} style={{ border: "0", background: "none", cursor: "pointer", font: "inherit", fontSize: "12px", letterSpacing: ".16em", textTransform: "uppercase" }}>
                    Remove
                  </button>
                </div>
              </div>
              <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "17px", fontWeight: "600" }}>{formatRupees(l.product.pricePaise * l.quantity)}</span>
                {l.product.mrpPaise > l.product.pricePaise && <s style={{ fontSize: "14px", color: "#6A5C4F" }}>{formatRupees(l.product.mrpPaise * l.quantity)}</s>}
              </div>
            </li>
          ))}
        </ul>

        {/* Contact */}
        <div>
          <span className="eyebrow">(02) — Contact</span>
          <h2 className="serif" style={{ ...h2Style, marginTop: "14px" }}>Who&apos;s it for?</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "28px 24px" }}>
            <label style={labelStyle}>Full name<input className="field" required autoComplete="name" value={form.name} onChange={set("name")} placeholder="Priya Deshpande" style={{ marginTop: "8px" }} /></label>
            <label style={labelStyle}>
              Mobile number
              <input className="field" required inputMode="numeric" autoComplete="tel-national" pattern="[6-9][0-9]{9}" title="10-digit Indian mobile number" maxLength={10} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "") }))} placeholder="98XXXXXXXX" style={{ marginTop: "8px" }} />
            </label>
            <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>Email (for your receipt)<input className="field" type="email" autoComplete="email" value={form.email} onChange={set("email")} placeholder="you@example.com" style={{ marginTop: "8px" }} /></label>
          </div>
        </div>

        {/* Address */}
        <div>
          <span className="eyebrow">(03) — Delivery address</span>
          <h2 className="serif" style={{ ...h2Style, marginTop: "14px" }}>Where should it <em style={{ color: "#7B4E33" }}>live?</em></h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "28px 24px" }}>
            <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>Flat / house no., building<input className="field" required autoComplete="address-line1" value={form.house} onChange={set("house")} placeholder="Flat 302, Sai Residency" style={{ marginTop: "8px" }} /></label>
            <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>Street, area<input className="field" required autoComplete="address-line2" value={form.street} onChange={set("street")} placeholder="Baner Road" style={{ marginTop: "8px" }} /></label>
            <label style={labelStyle}>
              Pincode
              <input className="field" required inputMode="numeric" autoComplete="postal-code" pattern="[1-9][0-9]{5}" title="6-digit pincode" maxLength={6} value={form.pincode} onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value.replace(/\D/g, "") }))} placeholder="411045" style={{ marginTop: "8px" }} />
            </label>
            <label style={labelStyle}>City<input className="field" required autoComplete="address-level2" value={form.city} onChange={set("city")} style={{ marginTop: "8px" }} /></label>
            <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
              State
              <select className="field" required autoComplete="address-level1" value={form.state} onChange={set("state")} style={{ marginTop: "8px", cursor: "pointer" }}>
                {STATES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Delivery speed */}
        <div>
          <span className="eyebrow">(04) — Delivery</span>
          <h2 className="serif" style={{ ...h2Style, marginTop: "14px" }}>How soon?</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {(Object.keys(delivery) as DeliveryMethod[]).map((key) => {
              const d = delivery[key];
              const disabled = key === "express" && form.pincode.length === 6 && !canExpress;
              const active = chosenMethod === key;
              return (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "22px 24px", borderRadius: "6px", border: `1px solid ${active ? "#231E1A" : "rgba(35,30,26,.2)"}`, background: active ? "#F7F1E8" : "transparent", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? ".5" : "1", transition: "background-color .4s, border-color .4s" }}>
                  <input type="radio" name="delivery" value={key} checked={active} disabled={disabled} onChange={() => setMethod(key)} style={{ accentColor: "#7B4E33", width: "18px", height: "18px" }} />
                  <span style={{ flex: "1", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span className="serif" style={{ fontSize: "24px" }}>{d.name}</span>
                    <span style={{ fontSize: "13px", color: "#6A5C4F" }}>{disabled ? "Not available for this pincode" : `Arrives in ${d.days}`}</span>
                  </span>
                  <span style={{ fontSize: "15px", fontWeight: "600" }}>{d.pricePaise === 0 ? "Free" : formatRupees(d.pricePaise)}</span>
                </label>
              );
            })}
          </div>
          <p style={{ margin: "14px 0 0", fontSize: "13px", color: "#6A5C4F" }}>
            {form.pincode.length !== 6
              ? "Express delivery is available across Pune (411001 to 411062)."
              : canExpress
                ? `Express delivery is available at ${form.pincode}.`
                : "Standard delivery reaches this pincode in 5 to 7 days."}
          </p>
        </div>

        {/* Payment method */}
        <div>
          <span className="eyebrow">(05) — Payment</span>
          <h2 className="serif" style={{ ...h2Style, marginTop: "14px" }}>How would you like to <em style={{ color: "#7B4E33" }}>pay?</em></h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {([
              ["upi", "UPI — scan & pay", "Scan with GPay, PhonePe or Paytm. The amount is filled in for you."],
              ["cashfree", "Cards, netbanking & wallets", "Pay securely through Cashfree. Confirmed instantly."],
            ] as const).map(([key, title, note]) => {
              const active = payMethod === key;
              return (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "22px 24px", borderRadius: "6px", border: `1px solid ${active ? "#231E1A" : "rgba(35,30,26,.2)"}`, background: active ? "#F7F1E8" : "transparent", cursor: "pointer", transition: "background-color .4s, border-color .4s" }}>
                  <input type="radio" name="paymethod" value={key} checked={active} onChange={() => { setPayMethod(key); setUpi(null); setError(""); }} style={{ accentColor: "#7B4E33", width: "18px", height: "18px" }} />
                  <span style={{ flex: "1", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span className="serif" style={{ fontSize: "24px" }}>{title}</span>
                    <span style={{ fontSize: "13px", color: "#6A5C4F" }}>{note}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary */}
      <aside style={{ gridColumn: "9 / span 4", position: "sticky", top: "110px" }}>
        <div style={{ background: "#F7F1E8", borderRadius: "6px", padding: "40px 36px" }}>
          <span className="eyebrow">Order summary</span>
          <dl style={{ margin: "28px 0 0", display: "flex", flexDirection: "column", gap: "14px", fontSize: "15px" }}>
            <Row label={`Subtotal (${store.cartCount} ${store.cartCount === 1 ? "item" : "items"})`} value={formatPaise(totals.subtotalPaise)} />
            <Row label="Delivery" value={totals.shippingPaise === 0 ? "Free" : formatPaise(totals.shippingPaise)} />
          </dl>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px", marginTop: "24px", paddingTop: "24px", borderTop: "1px solid #231E1A" }}>
            <span className="eyebrow" style={{ color: "#231E1A" }}>Total</span>
            <span className="serif" style={{ fontSize: "44px", fontWeight: "400", lineHeight: "1" }}>{formatPaise(totals.totalPaise)}</span>
          </div>
          <p style={{ margin: "8px 0 0", textAlign: "right", fontSize: "12px", color: "#6A5C4F" }}>
            Includes GST ({gstRateBps / 100}%) of {formatPaise(totals.gstIncludedPaise)}
          </p>
          {savings > 0 && (
            <p style={{ margin: "20px 0 0", fontSize: "13px", fontWeight: "600", color: "#8A4626" }}>You save {formatRupees(savings)} on this order</p>
          )}
          {error && (
            <p role="alert" style={{ margin: "20px 0 0", padding: "12px 16px", borderRadius: "6px", background: "#F2DED3", color: "#8A2E1C", fontSize: "14px", lineHeight: "1.5" }}>
              {error}
            </p>
          )}
          <button type="submit" className="btn" disabled={busy} style={{ width: "100%", marginTop: "28px", minHeight: "56px", opacity: busy ? ".7" : "1", cursor: busy ? "progress" : "pointer" }}>
            {busy
              ? payMethod === "upi" ? "Preparing your QR…" : "Opening secure payment…"
              : payMethod === "upi" ? `Show UPI QR · ${formatPaise(totals.totalPaise)}` : `Pay ${formatPaise(totals.totalPaise)}`}
          </button>
          {upi && payMethod === "upi" && (
            <div style={{ marginTop: "28px", paddingTop: "28px", borderTop: "1px solid #231E1A", textAlign: "center" }}>
              <span className="eyebrow">Scan to pay {formatPaise(upi.amount)}</span>
              <img decoding="async" src={upi.qrDataUrl} alt={`UPI QR code to pay ${formatPaise(upi.amount)} to ${upi.payeeName}`} width={240} height={240} style={{ display: "block", margin: "16px auto 8px", borderRadius: "6px", background: "#fff" }} />
              <p style={{ margin: "0", fontSize: "13px", color: "#6A5C4F", lineHeight: "1.6" }}>
                {upi.payeeName} · {upi.upiId}
                <br />
                On your phone? <a href={upi.upiLink} className="ulink" style={{ color: "#231E1A" }}>Open your UPI app</a>
              </p>
              <label style={{ ...labelStyle, textAlign: "left", marginTop: "22px" }}>
                After paying, enter the 12-digit UTR from your app
                <input className="field" inputMode="numeric" maxLength={12} value={utr} onChange={(e) => setUtr(e.target.value.replace(/\D/g, ""))} placeholder="123456789012" style={{ marginTop: "8px" }} />
              </label>
              <button type="button" className="btn" disabled={busy || utr.length !== 12} onClick={submitUtr} style={{ width: "100%", marginTop: "18px", opacity: busy || utr.length !== 12 ? ".6" : "1" }}>
                I have paid
              </button>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "center", gap: "6px", flexWrap: "wrap", marginTop: "18px" }}>
            {["UPI", "Cards", "Netbanking", "Wallets"].map((m) => (
              <span key={m} style={{ fontSize: "11px", fontWeight: "600", letterSpacing: ".1em", textTransform: "uppercase", padding: "6px 10px", borderRadius: "999px", border: "1px solid rgba(35,30,26,.2)", color: "#6A5C4F" }}>{m}</span>
            ))}
          </div>
          <p style={{ margin: "14px 0 0", textAlign: "center", fontSize: "12px", color: "#6A5C4F", lineHeight: "1.6" }}>
            {payMethod === "upi" ? "UPI QR payments go straight to our UPI ID and are checked against our bank statement before your order is confirmed." : "Payments secured by Cashfree. Every payment is verified on our server before your order is confirmed."}
          </p>
        </div>
      </aside>
    </form>
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
