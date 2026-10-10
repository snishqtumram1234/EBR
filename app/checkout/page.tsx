import type { Metadata } from "next";
import { Suspense } from "react";
import { GST_RATE_BPS } from "@/lib/config";
import { DEMO_DELIVERY } from "@/lib/pricing/delivery";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Your bag — Aurelle" };

export default function CheckoutPage() {
  return (
    <main>
      <section style={{ position: "relative", padding: "150px 0 140px" }}>
        <div className="wrap">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "24px", flexWrap: "wrap", marginBottom: "56px", position: "relative", paddingBottom: "18px" }}>
            <div>
              <span className="eyebrow fade">(01) — Checkout</span>
              <h1 className="serif" style={{ margin: "18px 0 0", fontWeight: "300", fontSize: "clamp(54px, 8.4vw, 140px)", lineHeight: ".9", letterSpacing: "-.02em" }}>
                <span className="rv"><span>Your</span></span>
                <span className="rv d1"><span><em style={{ color: "#7B4E33" }}>bag.</em></span></span>
              </h1>
            </div>
            <p className="fade d2" style={{ maxWidth: "340px", margin: "0", fontSize: "15px", lineHeight: "1.7", color: "#6A5C4F" }}>
              Secure checkout by Cashfree. Pay by UPI, card, netbanking or wallet. Test mode: no real money is charged.
            </p>
            <span className="line d2" style={{ position: "absolute", left: "0", right: "0", bottom: "0", height: "1px", background: "rgba(35,30,26,.2)" }} />
          </div>
          <Suspense fallback={<p className="eyebrow">Loading your bag…</p>}>
            <CheckoutForm delivery={DEMO_DELIVERY} gstRateBps={GST_RATE_BPS} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
