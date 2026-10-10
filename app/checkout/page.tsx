import type { Metadata } from "next";
import { Suspense } from "react";
import { DEMO_PRODUCTS } from "@/lib/payments/demo-catalog";
import { DEMO_DELIVERY } from "@/lib/pricing/delivery";
import { GST_RATE_BPS } from "@/lib/config";
import { CheckoutForm } from "./checkout-form";
import styles from "./checkout.module.css";

export const metadata: Metadata = { title: "Checkout · Furniture Store" };

export default function CheckoutPage() {
  // Display data only. The server re-prices everything when payment starts.
  const products = DEMO_PRODUCTS.map(({ id, name, pricePaise, mrpPaise, material, hex }) => ({
    id,
    name,
    pricePaise,
    mrpPaise,
    material,
    hex,
  }));

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.brand}>Furniture Store</span>
        <span className={styles.secure}>
          <LockIcon /> Secure checkout
        </span>
      </header>
      <Suspense fallback={<p className={styles.loading}>Loading checkout…</p>}>
        <CheckoutForm products={products} delivery={DEMO_DELIVERY} gstRateBps={GST_RATE_BPS} />
      </Suspense>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
