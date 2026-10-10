"use client";

import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { formatPaise } from "@/lib/money";
import { computeTotals } from "@/lib/pricing/totals";
import { expressAvailable, type DEMO_DELIVERY, type DeliveryMethod } from "@/lib/pricing/delivery";
import styles from "./checkout.module.css";

type Product = { id: string; name: string; pricePaise: number; mrpPaise: number; material: string; hex: string };

type ApiError = { error: { code: string; message: string } };

const STATES = [
  "Andhra Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
  "Odisha", "Puducherry", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

export function CheckoutForm({
  products,
  delivery,
  gstRateBps,
}: {
  products: Product[];
  delivery: typeof DEMO_DELIVERY;
  gstRateBps: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const initialProduct = products.find((p) => p.id === params.get("product")) ?? products[0];

  const [productId, setProductId] = useState(initialProduct.id);
  const [quantity, setQuantity] = useState(1);
  const [method, setMethod] = useState<DeliveryMethod>("standard");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    house: "",
    street: "",
    city: "Pune",
    state: "Maharashtra",
    pincode: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const product = products.find((p) => p.id === productId) ?? products[0];
  const canExpress = form.pincode.length === 6 && expressAvailable(form.pincode);
  const chosenMethod: DeliveryMethod = method === "express" && form.pincode.length === 6 && !canExpress ? "standard" : method;

  // Display only: the server recomputes these numbers before charging.
  const totals = useMemo(
    () =>
      computeTotals({
        lines: [{ unitPricePaise: product.pricePaise, quantity }],
        shippingPaise: delivery[chosenMethod].pricePaise,
        gstRateBps,
      }),
    [product.pricePaise, quantity, delivery, chosenMethod, gstRateBps],
  );
  const savings = (product.mrpPaise - product.pricePaise) * quantity;

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!window.Cashfree) {
      setError("Payment window is still loading. Please try again in a moment.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/payment/cashfree/create-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: [{ productId, quantity }],
          deliveryMethod: chosenMethod,
          customer: { name: form.name, phone: form.phone, email: form.email },
          address: { house: form.house, street: form.street, city: form.city, state: form.state, pincode: form.pincode },
        }),
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
      if (result.redirect) return; // Cashfree navigates to the receipt page itself.
      // Success, failure or closed popup: the receipt page asks Cashfree for the real status.
      router.push(`/checkout/success?order_id=${encodeURIComponent(data.orderId)}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form className={styles.layout} onSubmit={pay}>
      <Script src="https://sdk.cashfree.com/js/v3/cashfree.js" strategy="afterInteractive" />

      <div className={styles.main}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            <span className={styles.step}>1</span> Contact details
          </h2>
          <div className={styles.grid2}>
            <Field label="Full name">
              <input required autoComplete="name" value={form.name} onChange={set("name")} placeholder="Priya Deshpande" />
            </Field>
            <Field label="Mobile number">
              <div className={styles.prefixInput}>
                <span>+91</span>
                <input
                  required
                  inputMode="numeric"
                  autoComplete="tel-national"
                  pattern="[6-9][0-9]{9}"
                  title="10-digit Indian mobile number"
                  maxLength={10}
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "") }))}
                  placeholder="98XXXXXXXX"
                />
              </div>
            </Field>
            <Field label="Email (for receipt)" wide>
              <input type="email" autoComplete="email" value={form.email} onChange={set("email")} placeholder="you@example.com" />
            </Field>
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            <span className={styles.step}>2</span> Delivery address
          </h2>
          <div className={styles.grid2}>
            <Field label="Flat / house no., building" wide>
              <input required autoComplete="address-line1" value={form.house} onChange={set("house")} placeholder="Flat 302, Sai Residency" />
            </Field>
            <Field label="Street, area" wide>
              <input required autoComplete="address-line2" value={form.street} onChange={set("street")} placeholder="Baner Road" />
            </Field>
            <Field label="Pincode">
              <input
                required
                inputMode="numeric"
                autoComplete="postal-code"
                pattern="[1-9][0-9]{5}"
                title="6-digit pincode"
                maxLength={6}
                value={form.pincode}
                onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value.replace(/\D/g, "") }))}
                placeholder="411045"
              />
            </Field>
            <Field label="City">
              <input required autoComplete="address-level2" value={form.city} onChange={set("city")} />
            </Field>
            <Field label="State" wide>
              <select required autoComplete="address-level1" value={form.state} onChange={set("state")}>
                {STATES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            <span className={styles.step}>3</span> Delivery speed
          </h2>
          <div className={styles.options}>
            {(Object.keys(delivery) as DeliveryMethod[]).map((key) => {
              const d = delivery[key];
              const disabled = key === "express" && form.pincode.length === 6 && !canExpress;
              return (
                <label key={key} className={`${styles.option} ${chosenMethod === key ? styles.optionActive : ""} ${disabled ? styles.optionDisabled : ""}`}>
                  <input
                    type="radio"
                    name="delivery"
                    value={key}
                    checked={chosenMethod === key}
                    disabled={disabled}
                    onChange={() => setMethod(key)}
                  />
                  <span className={styles.optionBody}>
                    <strong>{d.name}</strong>
                    <span className={styles.muted}>
                      {disabled ? "Not available for this pincode" : `Arrives in ${d.days}`}
                    </span>
                  </span>
                  <span className={styles.optionPrice}>{d.pricePaise === 0 ? "FREE" : formatPaise(d.pricePaise)}</span>
                </label>
              );
            })}
          </div>
          {deliveryHint(form.pincode, canExpress)}
        </section>
      </div>

      <aside className={styles.summary}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Order summary</h2>

          <div className={styles.item}>
            <div className={styles.thumb} style={{ background: `linear-gradient(135deg, ${product.hex}, ${product.hex}cc)` }} aria-hidden="true">
              {initials(product.name)}
            </div>
            <div className={styles.itemBody}>
              <select className={styles.productSelect} value={productId} onChange={(e) => setProductId(e.target.value)} aria-label="Product">
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <span className={styles.muted}>{product.material}</span>
              <div className={styles.itemRow}>
                <div className={styles.stepper} role="group" aria-label="Quantity">
                  <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">
                    −
                  </button>
                  <span aria-live="polite">{quantity}</span>
                  <button type="button" onClick={() => setQuantity((q) => Math.min(10, q + 1))} aria-label="Increase quantity">
                    +
                  </button>
                </div>
                <div className={styles.price}>
                  <strong>{formatPaise(product.pricePaise * quantity)}</strong>
                  {product.mrpPaise > product.pricePaise && <s className={styles.muted}>{formatPaise(product.mrpPaise * quantity)}</s>}
                </div>
              </div>
            </div>
          </div>

          <dl className={styles.totals}>
            <div>
              <dt>Subtotal</dt>
              <dd>{formatPaise(totals.subtotalPaise)}</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>{totals.shippingPaise === 0 ? <span className={styles.free}>FREE</span> : formatPaise(totals.shippingPaise)}</dd>
            </div>
            <div className={styles.grand}>
              <dt>Total</dt>
              <dd>{formatPaise(totals.totalPaise)}</dd>
            </div>
            <div className={styles.gst}>
              <dt>Includes GST ({gstRateBps / 100}%)</dt>
              <dd>{formatPaise(totals.gstIncludedPaise)}</dd>
            </div>
          </dl>

          {savings > 0 && <p className={styles.savings}>You save {formatPaise(savings)} on this order</p>}

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <button type="submit" className={styles.payButton} disabled={busy}>
            {busy ? "Opening secure payment…" : `Pay ${formatPaise(totals.totalPaise)}`}
          </button>

          <div className={styles.trust}>
            <span>UPI</span>
            <span>Cards</span>
            <span>Netbanking</span>
            <span>Wallets</span>
          </div>
          <p className={styles.poweredBy}>Payments secured by Cashfree. Test mode: no real money is charged.</p>
        </section>
      </aside>
    </form>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`${styles.field} ${wide ? styles.wide : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function deliveryHint(pincode: string, canExpress: boolean) {
  if (pincode.length !== 6) return <p className={styles.hint}>Express delivery is available across Pune (411001 to 411062).</p>;
  if (canExpress) return <p className={styles.hint}>Great news: Express delivery is available at {pincode}.</p>;
  return null;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}
