import type { Metadata } from "next";
import { Suspense } from "react";
import { ShopView } from "./shop-view";

export const metadata: Metadata = { title: "Shop — Aurelle" };

export default function ShopPage() {
  return (
    <main>
      <section style={{ position: "relative", padding: "150px 0 140px" }}>
        <div className="wrap">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "24px", flexWrap: "wrap", marginBottom: "56px" }}>
            <div>
              <span className="eyebrow fade">(01) — The collection</span>
              <h1 className="serif" style={{ margin: "18px 0 0", fontWeight: "300", fontSize: "clamp(54px, 8.4vw, 140px)", lineHeight: ".9", letterSpacing: "-.02em" }}>
                <span className="rv"><span>Shop every</span></span>
                <span className="rv d1"><span><em style={{ color: "#7B4E33" }}>piece.</em></span></span>
              </h1>
            </div>
            <p className="fade d2" style={{ maxWidth: "340px", margin: "0", fontSize: "15px", lineHeight: "1.7", color: "#6A5C4F" }}>
              Ten categories, one quiet language of oak, walnut, linen and cane. Free standard delivery on every order.
            </p>
          </div>
          <Suspense fallback={<p className="eyebrow">Loading the collection…</p>}>
            <ShopView />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
