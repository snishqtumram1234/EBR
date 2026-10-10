"use client";
/* eslint-disable @next/next/no-img-element -- same markup as the design's product grid */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/components/store/store-provider";
import { offPercent, type Product } from "@/lib/catalog/products";
import { formatRupees } from "@/lib/catalog/format";

/** Product card, identical to the design's "This season's favourites" grid card. */
export function ProductCard({ p, onQuickView }: { p: Product; onQuickView?: (id: string) => void }) {
  const store = useStore();
  const router = useRouter();
  const on = store.isLiked(p.id);
  const offText = offPercent(p) + "% OFF";

  return (
    <article className="card fade" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative", aspectRatio: "4 / 5", overflow: "hidden", borderRadius: "4px", background: p.bg }}>
        <Link href={`/product/${p.id}`} data-cursor="View" aria-label={`View ${p.name}`} style={{ position: "absolute", inset: "0", display: "block", overflow: "hidden" }}>
          <div className="zoomh" style={{ position: "absolute", inset: "0" }}><img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /></div>
        </Link>
        <span style={{ position: "absolute", top: "16px", left: "16px", background: "#7B4E33", color: "#F7F1E8", fontSize: "11px", fontWeight: "600", letterSpacing: ".1em", padding: "6px 10px", borderRadius: "999px" }}>{offText}</span>
        <button onClick={() => store.toggleLike(p.id)} aria-label={on ? `Remove ${p.name} from wishlist` : `Save ${p.name} to wishlist`} style={{ position: "absolute", top: "10px", right: "10px", width: "44px", height: "44px", borderRadius: "50%", border: "0", background: "#F7F1E8", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill={on ? "#A65A35" : "none"} stroke={on ? "#A65A35" : "#231E1A"} strokeWidth="1.6" strokeLinejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
        </button>
        <div className="qv" style={{ position: "absolute", left: "12px", right: "12px", bottom: "12px", display: "flex", gap: "8px" }}>
          <button className="btn" onClick={() => store.add(p.id, p.name)} style={{ flex: "1", minHeight: "44px", padding: "0 14px", fontSize: "11px" }}>Add to cart</button>
          <button className="btn btn-l" onClick={() => (onQuickView ? onQuickView(p.id) : router.push(`/product/${p.id}`))} style={{ minHeight: "44px", padding: "0 16px", fontSize: "11px" }}>Quick view</button>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "16px", fontSize: "13px", color: "#6A5C4F" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#7B4E33" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg>
        <span>{p.rating} · {p.catName}</span>
      </div>
      <Link href={`/product/${p.id}`} className="serif" style={{ marginTop: "6px", fontSize: "26px", lineHeight: "1.15", color: "#231E1A", textDecoration: "none" }}>{p.name}</Link>
      <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginTop: "8px" }}>
        <span style={{ fontSize: "17px", fontWeight: "600" }}>{formatRupees(p.pricePaise)}</span>
        <s style={{ fontSize: "14px", color: "#6A5C4F" }}>{formatRupees(p.mrpPaise)}</s>
        <span style={{ fontSize: "12px", fontWeight: "600", color: "#8A4626" }}>{offText}</span>
      </div>
    </article>
  );
}
