/* eslint-disable @next/next/no-img-element -- art-directed crops in the design's clip/zoom wrappers */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductCard } from "@/components/product/product-card";
import { formatRupees } from "@/lib/catalog/format";
import { LISTED_PRODUCTS, findProduct, offPercent } from "@/lib/catalog/products";
import { ProductActions } from "./product-actions";

export function generateStaticParams() {
  return LISTED_PRODUCTS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: PageProps<"/product/[id]">): Promise<Metadata> {
  const p = findProduct((await params).id);
  return { title: p ? `${p.name} — Aurelle` : "Not found — Aurelle", description: p?.desc };
}

export default function ProductPage({ params }: PageProps<"/product/[id]">) {
  return (
    <Suspense fallback={<main style={{ minHeight: "100vh" }} />}>
      <ProductContent params={params} />
    </Suspense>
  );
}

async function ProductContent({ params }: { params: PageProps<"/product/[id]">["params"] }) {
  const p = findProduct((await params).id);
  if (!p || p.hidden) notFound();

  const related = LISTED_PRODUCTS.filter((r) => r.id !== p.id && r.kind !== p.kind).slice(0, 4);

  return (
    <main>
      <section style={{ position: "relative", paddingTop: "112px", paddingBottom: "120px" }}>
        <div className="wrap">
          <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", paddingBottom: "18px", position: "relative" }}>
            <span className="eyebrow fade d1">
              <Link href="/shop" className="ulink" style={{ color: "#6A5C4F" }}>Shop</Link> / {p.catName}
            </span>
            <span className="eyebrow fade d2">N°{String(p.num).padStart(2, "0")} · Made for Indian homes</span>
            <span className="line d2" style={{ position: "absolute", left: "0", right: "0", bottom: "0", height: "1px", background: "rgba(35,30,26,.2)" }} />
          </div>

          <div className="mg" style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: "24px", alignItems: "start", marginTop: "56px" }}>
            <div style={{ gridColumn: "span 7" }}>
              <div className="clip d1" data-cursor="View" style={{ position: "relative", aspectRatio: "4 / 5", overflow: "hidden", borderRadius: "999px 999px 6px 6px", background: p.bg }}>
                <div data-speed="0.08" style={{ position: "absolute", left: "0", right: "0", top: "-10%", bottom: "-10%" }}>
                  <div className="zoom" style={{ position: "absolute", inset: "0" }}>
                    <img decoding="async" src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ gridColumn: "9 / span 4", position: "sticky", top: "120px" }}>
              <div className="fade d1" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#6A5C4F" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#7B4E33" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg>
                <span>{p.rating} · {p.catName}</span>
              </div>
              <h1 className="serif" style={{ margin: "14px 0 0", fontWeight: "300", fontSize: "clamp(44px, 4.6vw, 72px)", lineHeight: ".95", letterSpacing: "-.02em" }}>
                <span className="rv d1"><span>{p.name}</span></span>
              </h1>
              <div className="fade d2" style={{ display: "flex", alignItems: "baseline", gap: "10px", marginTop: "24px" }}>
                <span style={{ fontSize: "24px", fontWeight: "600" }}>{formatRupees(p.pricePaise)}</span>
                <s style={{ fontSize: "16px", color: "#6A5C4F" }}>{formatRupees(p.mrpPaise)}</s>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#8A4626" }}>{offPercent(p)}% OFF</span>
              </div>
              <p className="eyebrow fade d2" style={{ margin: "8px 0 0" }}>Inclusive of GST</p>
              <p className="fade d3" style={{ margin: "28px 0 0", fontSize: "16px", lineHeight: "1.7", color: "#4F4338" }}>{p.desc}</p>

              <dl className="fade d3" style={{ margin: "28px 0", display: "grid", gridTemplateColumns: "auto 1fr", gap: "10px 24px", fontSize: "14px", paddingTop: "24px", borderTop: "1px solid rgba(35,30,26,.14)" }}>
                <dt style={{ color: "#6A5C4F" }}>Material</dt><dd style={{ margin: "0" }}>{p.material}</dd>
                <dt style={{ color: "#6A5C4F" }}>Dimensions</dt><dd style={{ margin: "0" }}>{p.dims}</dd>
                <dt style={{ color: "#6A5C4F" }}>Delivery</dt><dd style={{ margin: "0" }}>Free · 5–7 days · Express ₹499 · 2–3 days in Pune</dd>
                <dt style={{ color: "#6A5C4F" }}>Returns</dt><dd style={{ margin: "0" }}>7-day easy returns</dd>
              </dl>

              <div className="fade d4">
                <ProductActions id={p.id} name={p.name} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: "120px 0 140px", background: "#F7F1E8" }}>
        <div className="wrap">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "24px", flexWrap: "wrap", marginBottom: "56px" }}>
            <div>
              <span className="eyebrow fade">(02) — Complete the room</span>
              <h2 className="serif" style={{ margin: "18px 0 0", fontWeight: "300", fontSize: "clamp(44px, 6vw, 96px)", lineHeight: ".95", letterSpacing: "-.02em" }}>
                <span className="rv"><span>You may</span></span>
                <span className="rv d1"><span><em style={{ color: "#7B4E33" }}>also like</em></span></span>
              </h2>
            </div>
            <Link href="/shop" className="ulink fade d2" style={{ fontSize: "12px", letterSpacing: ".16em", textTransform: "uppercase" }}>View all furniture →</Link>
          </div>
          <div className="pgrid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "48px 24px" }}>
            {related.map((r) => (
              <ProductCard key={r.id} p={r} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
