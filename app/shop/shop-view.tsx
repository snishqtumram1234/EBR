"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { ProductCard } from "@/components/product/product-card";
import { useStore } from "@/components/store/store-provider";
import { CATEGORIES, LISTED_PRODUCTS, type ProductKind } from "@/lib/catalog/products";

const ROOMS: Record<string, { label: string; kinds: ProductKind[] }> = {
  living: { label: "Living room", kinds: ["sofa", "chair", "coffee", "tv", "decor"] },
  bedroom: { label: "Bedroom", kinds: ["bed", "wardrobe", "decor"] },
  dining: { label: "Dining", kinds: ["dining", "cabinet"] },
};

const SORTS = {
  popular: "Most popular",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  rating: "Top rated",
} as const;
type SortKey = keyof typeof SORTS;

export function ShopView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const store = useStore();

  const cat = params.get("cat") ?? "";
  const room = params.get("room") ?? "";
  const saved = params.get("saved") === "1";
  const q = params.get("q") ?? "";
  const sort = (params.get("sort") ?? "popular") as SortKey;

  const setParam = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const products = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = LISTED_PRODUCTS.filter((p) => {
      if (cat && p.kind !== cat) return false;
      if (room && ROOMS[room] && !ROOMS[room].kinds.includes(p.kind)) return false;
      if (saved && !store.liked.includes(p.id)) return false;
      if (term && !`${p.name} ${p.catName} ${p.material}`.toLowerCase().includes(term)) return false;
      return true;
    });
    const sorted = [...list];
    if (sort === "price-asc") sorted.sort((a, b) => a.pricePaise - b.pricePaise);
    else if (sort === "price-desc") sorted.sort((a, b) => b.pricePaise - a.pricePaise);
    else if (sort === "rating") sorted.sort((a, b) => b.rating - a.rating);
    return sorted;
  }, [cat, room, saved, q, sort, store.liked]);

  const chip = (active: boolean) => ({
    minHeight: "44px",
    padding: "0 22px",
    borderRadius: "999px",
    border: "1px solid #231E1A",
    background: active ? "#231E1A" : "transparent",
    color: active ? "#F7F1E8" : "#231E1A",
    font: "500 12px var(--font-manrope), Manrope, sans-serif",
    letterSpacing: ".14em",
    textTransform: "uppercase" as const,
    cursor: "pointer",
    transition: "background-color .4s, color .4s",
  });

  const allActive = !cat && !room && !saved;

  return (
    <>
      <div className="fade d2" role="tablist" aria-label="Categories" style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "28px" }}>
        <button role="tab" aria-selected={allActive} onClick={() => setParam({ cat: null, room: null, saved: null })} style={chip(allActive)}>All</button>
        {CATEGORIES.map((c) => (
          <button key={c.kind} role="tab" aria-selected={cat === c.kind} onClick={() => setParam({ cat: c.kind, room: null, saved: null })} style={chip(cat === c.kind)}>
            {c.name}
          </button>
        ))}
        <button role="tab" aria-selected={saved} onClick={() => setParam({ saved: "1", cat: null, room: null })} style={chip(saved)}>
          Saved ({store.likedCount})
        </button>
      </div>

      <div className="fade d3" style={{ display: "flex", gap: "24px 40px", alignItems: "flex-end", flexWrap: "wrap", marginBottom: "56px", position: "relative", paddingBottom: "18px" }}>
        <label style={{ flex: "1 1 320px", fontSize: "12px", letterSpacing: ".16em", textTransform: "uppercase", color: "#6A5C4F" }}>
          Search
          <input
            className="field"
            type="search"
            value={q}
            onChange={(e) => setParam({ q: e.target.value || null })}
            placeholder="Oak, linen, sofa…"
            style={{ marginTop: "8px" }}
          />
        </label>
        <label style={{ flex: "0 1 260px", fontSize: "12px", letterSpacing: ".16em", textTransform: "uppercase", color: "#6A5C4F" }}>
          Sort by
          <select className="field" value={sort} onChange={(e) => setParam({ sort: e.target.value === "popular" ? null : e.target.value })} style={{ marginTop: "8px", cursor: "pointer" }}>
            {Object.entries(SORTS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </label>
        <span className="line d2" style={{ position: "absolute", left: "0", right: "0", bottom: "0", height: "1px", background: "rgba(35,30,26,.2)" }} />
      </div>

      {(room && ROOMS[room]) || q ? (
        <p className="eyebrow" style={{ margin: "0 0 32px" }}>
          {room && ROOMS[room] ? `Shop the ${ROOMS[room].label.toLowerCase()} · ` : ""}
          {products.length} {products.length === 1 ? "piece" : "pieces"}
          {q ? ` for “${q}”` : ""}
        </p>
      ) : null}

      {products.length > 0 ? (
        <div className="pgrid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "48px 24px" }}>
          {products.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      ) : (
        <div style={{ padding: "80px 0", textAlign: "center" }}>
          <p className="serif" style={{ fontSize: "40px", fontWeight: "300", margin: "0 0 24px" }}>
            {saved ? "Nothing saved yet." : <>No pieces <em style={{ color: "#7B4E33" }}>match.</em></>}
          </p>
          <button className="btn btn-o" onClick={() => setParam({ cat: null, room: null, saved: null, q: null })}>Show everything</button>
        </div>
      )}
    </>
  );
}
