"use client";
/* eslint-disable @next/next/no-img-element -- markup reproduced from the design reference; images are fixed-size art-directed crops */

import Link from "next/link";
import { Fragment, useState } from "react";
import { useStore } from "@/components/store/store-provider";
import { formatRupees } from "@/lib/catalog/format";
import { CATEGORIES, HOME_TABS, KIND_IMAGES, LISTED_PRODUCTS, offPercent, type Product } from "@/lib/catalog/products";

/**
 * Home page, reproduced from the design reference (Main.dc.html). Markup and
 * inline style values are carried over exactly; renderVals() mirrors the
 * design's own state-to-view mapping. Motion is driven by <MotionEngine/>.
 */

const fmt = formatRupees;
const MARQUEE_WORDS = ["Sofas", "Beds", "Dining", "Chairs", "Wardrobes", "TV units", "Study", "Coffee tables", "Cabinets", "Décor"];

export function HomePage() {
  const store = useStore();
  const [tab, setTab] = useState("trending");
  const [qv, setQv] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [newsletterError, setNewsletterError] = useState("");

  const dec = (p: Product) => {
    const on = store.isLiked(p.id);
    return {
      ...p,
      img: p.image,
      priceText: fmt(p.pricePaise),
      mrpText: fmt(p.mrpPaise),
      offText: offPercent(p) + "% OFF",
      heart: on ? "#A65A35" : "none",
      heartStroke: on ? "#A65A35" : "#231E1A",
      likeLabel: on ? "Remove " + p.name + " from wishlist" : "Save " + p.name + " to wishlist",
      like: () => store.toggleLike(p.id),
      add: () => {
        store.add(p.id, p.name);
        setQv(null);
      },
      quick: () => setQv(p.id),
    };
  };

  const byNum = (n: number) => LISTED_PRODUCTS.find((p) => p.num === n)!;
  const cur = HOME_TABS.find((t) => t.key === tab) ?? HOME_TABS[0];
  const tabs = HOME_TABS.map((t) => {
    const on = t.key === tab;
    return { label: t.label, bg: on ? "#231E1A" : "transparent", fg: on ? "#F7F1E8" : "#231E1A", pressed: on, pick: () => setTab(t.key) };
  });
  const shown = cur.nums.map((n) => dec(byNum(n)));
  const cats = CATEGORIES.map((c, i) => ({ num: (i < 9 ? "0" : "") + (i + 1), name: c.name, kind: c.kind, img: KIND_IMAGES[c.kind], bg: c.bg }));
  const marquee = MARQUEE_WORDS.concat(MARQUEE_WORDS);
  const q = dec(LISTED_PRODUCTS.find((p) => p.id === qv) ?? LISTED_PRODUCTS[0]);
  const qvOpen = qv !== null;
  const closeQuick = () => setQv(null);
  const notSubscribed = !subscribed;

  const subscribe = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNewsletterError("");
    const email = new FormData(e.currentTarget).get("email");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        setNewsletterError(body?.error?.message ?? "Please try again.");
        return;
      }
      setSubscribed(true);
    } catch {
      setNewsletterError("Please try again.");
    }
  };

  return (
    <>
<div className="loader" aria-hidden="true" style={{ flexDirection: "column", justifyContent: "space-between", padding: "40px clamp(20px,4vw,56px)" }}>
<div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", letterSpacing: ".18em", textTransform: "uppercase", opacity: ".7" }}><span>Aurelle Living</span><span>Furniture &amp; Interiors</span></div>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "24px" }}>
<div className="serif" style={{ fontSize: "clamp(48px, 9vw, 140px)", fontWeight: "300", lineHeight: ".9" }}>Feel<br /><em>at home.</em></div>
<div className="serif" data-loader-count="1" style={{ fontSize: "clamp(48px, 9vw, 140px)", fontWeight: "300", lineHeight: ".9" }}>000</div>
</div>
</div>
<main>
{/* HERO */}
<section style={{ position: "relative", paddingTop: "112px", paddingBottom: "72px" }}>
<div className="wrap">
<div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", paddingBottom: "18px", position: "relative" }}>
<span className="eyebrow fade d1">Collection N°01 — Autumn / Winter 2026</span>
<span className="eyebrow fade d2">Furniture &amp; Interiors · Made for Indian homes</span>
<span className="line d2" style={{ position: "absolute", left: "0", right: "0", bottom: "0", height: "1px", background: "rgba(35,30,26,.2)" }}></span>
</div>
<div className="mg" style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: "24px", alignItems: "end", marginTop: "56px" }}>
<div style={{ gridColumn: "span 7" }}>
<h1 className="serif" style={{ margin: "0", fontWeight: "300", fontSize: "clamp(54px, 8.4vw, 140px)", lineHeight: ".9", letterSpacing: "-.02em", color: "#231E1A" }}>
<span className="rv d1"><span>Furniture that</span></span>
<span className="rv d2"><span>makes your space</span></span>
<span className="rv d3"><span>feel <em style={{ fontStyle: "italic", color: "#7B4E33" }}>like home.</em></span></span>
</h1>
<div className="fade d4" style={{ display: "flex", flexWrap: "wrap", gap: "32px 48px", alignItems: "flex-start", marginTop: "52px" }}>
<p style={{ maxWidth: "340px", margin: "0", fontSize: "16px", lineHeight: "1.7", color: "#6A5C4F" }}>Sofas, beds, dining and storage — designed for slow mornings and long evenings, delivered free to your door.</p>
<div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
<Link href="/shop" className="btn">Shop now</Link>
<a href="#featured" className="btn btn-o">Explore collection</a>
</div>
</div>
</div>
<div style={{ gridColumn: "span 5", position: "relative" }}>
<div className="clip d2" data-cursor="Shop" style={{ position: "relative", aspectRatio: "4 / 5", borderRadius: "999px 999px 6px 6px", overflow: "hidden", background: "#E2D2BA" }}>
<div data-speed="0.1" style={{ position: "absolute", left: "0", right: "0", top: "-12%", bottom: "-12%" }}>
<div className="zoom" style={{ position: "absolute", inset: "0" }}><img src="/images/hero-living.jpg" alt="Linen Cloud Sofa with a round oak coffee table, floor lamp and terracotta vase in warm window light" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 70%", display: "block" }} /></div>
</div>
</div>
<div data-speed="-0.18" className="hide-sm" style={{ position: "absolute", left: "-64px", bottom: "64px", width: "128px", height: "128px" }}>
<div className="fade d5" style={{ width: "128px", height: "128px", borderRadius: "50%", background: "#EFE6D8", display: "flex", alignItems: "center", justifyContent: "center" }}>
<svg className="spin badge" viewBox="0 0 120 120" width="120" height="120" aria-hidden="true"><defs><path id="badgeCircle" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" /></defs><text><textPath href="#badgeCircle">Free delivery · 7-day returns · </textPath></text></svg>
<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#7B4E33" strokeWidth="1.4" style={{ position: "absolute" }}><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" /></svg>
</div>
</div>
</div>
</div>
<div className="fade d5 hide-sm" style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "48px" }}>
<div className="cue"></div>
<span className="eyebrow">Scroll to explore</span>
</div>
</div>
</section>

{/* MARQUEE */}
<section aria-label="Categories we make" style={{ padding: "44px 0", borderTop: "1px solid rgba(35,30,26,.14)", borderBottom: "1px solid rgba(35,30,26,.14)", overflow: "hidden" }}>
<div data-skew="1">
<div className="mq-track serif" style={{ fontSize: "clamp(48px, 7vw, 104px)", fontWeight: "300", fontStyle: "italic", lineHeight: "1.1", color: "#231E1A" }}>
{marquee.map((m, i) => (<Fragment key={i}>
<span style={{ display: "inline-flex", alignItems: "center", gap: "40px", paddingRight: "40px", whiteSpace: "nowrap" }}>{m}<svg width="18" height="18" viewBox="0 0 24 24" fill="#7B4E33" aria-hidden="true"><path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" /></svg></span>
</Fragment>))}
</div>
</div>
</section>

{/* STATEMENT */}
<section style={{ padding: "168px 0 150px" }}>
<div className="wrap mg" style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: "24px" }}>
<div style={{ gridColumn: "span 3" }}><span className="eyebrow fade">(01) — The house</span></div>
<p data-fill="1" className="serif" style={{ gridColumn: "span 9", margin: "0", fontSize: "clamp(32px, 4.3vw, 66px)", lineHeight: "1.1", fontWeight: "300", color: "#231E1A", letterSpacing: "-.01em" }}><span className="w">Pieces </span><span className="w">made </span><span className="w">to </span><span className="w">be </span><span className="w">lived </span><span className="w">with — </span><span className="w">chosen </span><span className="w">slowly, </span><span className="w">built </span><span className="w">carefully, </span><span className="w">and </span><span className="w">shaped </span><span className="w">around </span><span className="w">the </span><span className="w">way </span><span className="w">you </span><span className="w">really </span><span className="w">live: </span><span className="w">Sunday </span><span className="w">lunches, </span><span className="w">late </span><span className="w">work </span><span className="w">nights, </span><span className="w">and </span><span className="w">the </span><span className="w">quiet </span><span className="w">mornings </span><span className="w">that </span><span className="w">make </span><span className="w">a </span><span className="w">house </span><span className="w"><em style={{ color: "#7B4E33" }}>a home.</em></span></p>
</div>
</section>

{/* FEATURED */}
<section id="featured" style={{ padding: "40px 0 160px" }}>
<div className="wrap">
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "24px", flexWrap: "wrap", marginBottom: "72px" }}>
<h2 className="serif" style={{ margin: "0", fontWeight: "300", fontSize: "clamp(44px, 6vw, 96px)", lineHeight: ".95", letterSpacing: "-.02em" }}>
<span className="rv"><span>Featured</span></span>
<span className="rv d1"><span><em style={{ color: "#7B4E33" }}>pieces</em></span></span>
</h2>
<div className="fade d2" style={{ maxWidth: "360px" }}>
<p style={{ margin: "0 0 20px", fontSize: "15px", lineHeight: "1.7", color: "#6A5C4F" }}>Three pieces from this season&apos;s collection — in solid woods and warm, honest fabrics.</p>
<Link href="/shop" className="ulink" style={{ fontSize: "12px", letterSpacing: ".16em", textTransform: "uppercase" }}>View all furniture →</Link>
</div>
</div>
<div className="mg" style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: "24px" }}>
<Link href="/product/modern-oak-study-table" className="card" data-cursor="View" style={{ gridColumn: "1 / span 7", display: "block", textDecoration: "none", color: "#231E1A" }}>
<div className="clip" style={{ position: "relative", aspectRatio: "5 / 4", overflow: "hidden", borderRadius: "4px", background: "#E4D6C1" }}>
<div data-speed="-0.07" style={{ position: "absolute", left: "0", right: "0", top: "-9%", bottom: "-9%" }}>
<div className="zoom" style={{ position: "absolute", inset: "0" }}><div className="zoomh" style={{ position: "absolute", inset: "0" }}><img src="/images/study-table.jpg" alt="Modern Oak Study Table with a desk lamp and books" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 62%", display: "block" }} /></div></div>
</div>
<span style={{ position: "absolute", top: "22px", left: "24px", fontSize: "12px", letterSpacing: ".18em" }}>N°01</span>
<span style={{ position: "absolute", top: "22px", right: "24px", fontSize: "12px", letterSpacing: ".18em", textTransform: "uppercase" }}>Study</span>
</div>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "16px", marginTop: "20px" }}>
<h3 className="serif" style={{ margin: "0", fontSize: "clamp(26px, 2.4vw, 36px)", fontWeight: "400" }}>Modern Oak Study Table</h3>
<span style={{ fontSize: "16px", fontWeight: "500" }}>₹14,999</span>
</div>
<p style={{ margin: "6px 0 0", fontSize: "14px", color: "#6A5C4F" }}>Solid oak wood · 120 × 60 × 75 cm</p>
</Link>
<Link href="/product/modern-lounge-chair" className="card" data-cursor="View" style={{ gridColumn: "9 / span 4", marginTop: "240px", display: "block", textDecoration: "none", color: "#231E1A" }}>
<div className="clip d1" style={{ position: "relative", aspectRatio: "4 / 5", overflow: "hidden", borderRadius: "4px", background: "#D9C9B0" }}>
<div data-speed="-0.1" style={{ position: "absolute", left: "0", right: "0", top: "-10%", bottom: "-10%" }}>
<div className="zoom" style={{ position: "absolute", inset: "0" }}><div className="zoomh" style={{ position: "absolute", inset: "0" }}><img src="/images/lounge-chair.jpg" alt="Modern Lounge Chair in teak and cream bouclé" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /></div></div>
</div>
<span style={{ position: "absolute", top: "22px", left: "24px", fontSize: "12px", letterSpacing: ".18em" }}>N°02</span>
</div>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "16px", marginTop: "20px" }}>
<h3 className="serif" style={{ margin: "0", fontSize: "clamp(26px, 2.4vw, 36px)", fontWeight: "400" }}>Modern Lounge Chair</h3>
<span style={{ fontSize: "16px", fontWeight: "500" }}>₹8,499</span>
</div>
<p style={{ margin: "6px 0 0", fontSize: "14px", color: "#6A5C4F" }}>Teak frame · bouclé upholstery</p>
</Link>
<Link href="/product/walnut-platform-bed" className="card" data-cursor="View" style={{ gridColumn: "3 / span 6", marginTop: "96px", display: "block", textDecoration: "none", color: "#231E1A" }}>
<div className="clip" style={{ position: "relative", aspectRatio: "16 / 10", overflow: "hidden", borderRadius: "4px", background: "#E9DFD0" }}>
<div data-speed="-0.06" style={{ position: "absolute", left: "0", right: "0", top: "-9%", bottom: "-9%" }}>
<div className="zoom" style={{ position: "absolute", inset: "0" }}><div className="zoomh" style={{ position: "absolute", inset: "0" }}><img src="/images/platform-bed.jpg" alt="Walnut Platform Bed with upholstered headboard and sage linen" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 60%", display: "block" }} /></div></div>
</div>
<span style={{ position: "absolute", top: "22px", left: "24px", fontSize: "12px", letterSpacing: ".18em" }}>N°03</span>
</div>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "16px", marginTop: "20px" }}>
<h3 className="serif" style={{ margin: "0", fontSize: "clamp(26px, 2.4vw, 36px)", fontWeight: "400" }}>Walnut Platform Bed</h3>
<span style={{ fontSize: "16px", fontWeight: "500" }}>₹42,499</span>
</div>
<p style={{ margin: "6px 0 0", fontSize: "14px", color: "#6A5C4F" }}>Walnut veneer · upholstered headboard · Queen</p>
</Link>
</div>
</div>
</section>

{/* CATEGORIES: scroll-driven horizontal track */}
<section id="categories" style={{ padding: "140px 0", background: "#F7F1E8", overflow: "hidden" }}>
<div className="wrap" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "24px", flexWrap: "wrap", marginBottom: "64px" }}>
<div>
<span className="eyebrow fade">(02) — Shop by category</span>
<h2 className="serif" style={{ margin: "18px 0 0", fontWeight: "300", fontSize: "clamp(44px, 6vw, 96px)", lineHeight: ".95", letterSpacing: "-.02em" }}>
<span className="rv"><span>Every room,</span></span>
<span className="rv d1"><span><em style={{ color: "#7B4E33" }}>considered.</em></span></span>
</h2>
</div>
<p className="fade d2" style={{ maxWidth: "320px", margin: "0", fontSize: "15px", lineHeight: "1.7", color: "#6A5C4F" }}>Ten categories, one quiet language of oak, walnut, linen and cane.</p>
</div>
<div className="hx-box" style={{ padding: "0 clamp(20px,4vw,56px)" }}>
<div data-hx="1" style={{ display: "flex", gap: "20px", width: "max-content", paddingBottom: "8px" }}>
{cats.map((c, i) => (<Fragment key={i}>
<Link href={`/shop?cat=${c.kind}`} className="card" data-cursor="Shop" style={{ flex: "0 0 auto", width: "340px", display: "block", textDecoration: "none", color: "#231E1A" }}>
<div style={{ position: "relative", aspectRatio: "4 / 5", overflow: "hidden", borderRadius: "4px", background: c.bg }}>
<div className="zoomh" style={{ position: "absolute", inset: "0" }}><img src={c.img} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /></div>
<span style={{ position: "absolute", top: "20px", left: "22px", fontSize: "12px", letterSpacing: ".18em" }}>{c.num}</span>
</div>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "16px" }}>
<h3 className="serif" style={{ margin: "0", fontSize: "30px", fontWeight: "400" }}>{c.name}</h3>
<span style={{ fontSize: "12px", letterSpacing: ".16em", textTransform: "uppercase" }}>Explore →</span>
</div>
</Link>
</Fragment>))}
</div>
</div>
</section>

{/* PRODUCTS: trending / new / best */}
<section id="shop" style={{ padding: "150px 0 140px" }}>
<div className="wrap">
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "24px", flexWrap: "wrap", marginBottom: "56px" }}>
<div>
<span className="eyebrow fade">(03) — The edit</span>
<h2 className="serif" style={{ margin: "18px 0 0", fontWeight: "300", fontSize: "clamp(44px, 6vw, 96px)", lineHeight: ".95", letterSpacing: "-.02em" }}>
<span className="rv"><span>This season&apos;s</span></span>
<span className="rv d1"><span><em style={{ color: "#7B4E33" }}>favourites</em></span></span>
</h2>
</div>
<div className="fade d2" role="tablist" aria-label="Product lists" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
{tabs.map((t, i) => (<Fragment key={i}>
<button role="tab" aria-selected={t.pressed} onClick={t.pick} style={{ minHeight: "44px", padding: "0 22px", borderRadius: "999px", border: "1px solid #231E1A", background: t.bg, color: t.fg, font: "500 12px var(--font-manrope), Manrope, sans-serif", letterSpacing: ".14em", textTransform: "uppercase", cursor: "pointer", transition: "background-color .4s, color .4s" }}>{t.label}</button>
</Fragment>))}
</div>
</div>
<div className="pgrid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "48px 24px" }}>
{shown.map((p, i) => (<Fragment key={i}>
<article className="card fade" style={{ display: "flex", flexDirection: "column" }}>
<div style={{ position: "relative", aspectRatio: "4 / 5", overflow: "hidden", borderRadius: "4px", background: p.bg }}>
<Link href={`/product/${p.id}`} data-cursor="View" aria-label={`View ${p.name}`} style={{ position: "absolute", inset: "0", display: "block", overflow: "hidden" }}>
<div className="zoomh" style={{ position: "absolute", inset: "0" }}><img src={p.img} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /></div>
</Link>
<span style={{ position: "absolute", top: "16px", left: "16px", background: "#7B4E33", color: "#F7F1E8", fontSize: "11px", fontWeight: "600", letterSpacing: ".1em", padding: "6px 10px", borderRadius: "999px" }}>{p.offText}</span>
<button onClick={p.like} aria-label={p.likeLabel} style={{ position: "absolute", top: "10px", right: "10px", width: "44px", height: "44px", borderRadius: "50%", border: "0", background: "#F7F1E8", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
<svg width="18" height="18" viewBox="0 0 24 24" fill={p.heart} stroke={p.heartStroke} strokeWidth="1.6" strokeLinejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
</button>
<div className="qv" style={{ position: "absolute", left: "12px", right: "12px", bottom: "12px", display: "flex", gap: "8px" }}>
<button className="btn" onClick={p.add} style={{ flex: "1", minHeight: "44px", padding: "0 14px", fontSize: "11px" }}>Add to cart</button>
<button className="btn btn-l" onClick={p.quick} style={{ minHeight: "44px", padding: "0 16px", fontSize: "11px" }}>Quick view</button>
</div>
</div>
<div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "16px", fontSize: "13px", color: "#6A5C4F" }}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="#7B4E33" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg>
<span>{p.rating} · {p.catName}</span>
</div>
<Link href={`/product/${p.id}`} className="serif" style={{ marginTop: "6px", fontSize: "26px", lineHeight: "1.15", color: "#231E1A", textDecoration: "none" }}>{p.name}</Link>
<div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginTop: "8px" }}>
<span style={{ fontSize: "17px", fontWeight: "600" }}>{p.priceText}</span>
<s style={{ fontSize: "14px", color: "#6A5C4F" }}>{p.mrpText}</s>
<span style={{ fontSize: "12px", fontWeight: "600", color: "#8A4626" }}>{p.offText}</span>
</div>
</article>
</Fragment>))}
</div>
</div>
</section>

{/* PROMO */}
<section aria-label="The Living Room Edit" style={{ position: "relative", overflow: "hidden", background: "#3B2A1F", color: "#F2E9DC", padding: "150px 0" }}>
<div data-speed="0.25" aria-hidden="true" style={{ position: "absolute", left: "0", right: "0", top: "34px", whiteSpace: "nowrap", textAlign: "center" }}>
<span className="serif" style={{ fontSize: "clamp(120px, 20vw, 320px)", fontWeight: "300", fontStyle: "italic", lineHeight: "1", color: "rgba(242,233,220,.06)" }}>Living Room</span>
</div>
<div className="wrap mg" style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: "24px", alignItems: "center" }}>
<div style={{ gridColumn: "span 5" }}>
<span className="fade" style={{ fontSize: "12px", letterSpacing: ".18em", textTransform: "uppercase", color: "#D9C3A5" }}>Limited time — the seasonal edit</span>
<h2 className="serif" style={{ margin: "22px 0 0", fontWeight: "300", fontSize: "clamp(48px, 6.4vw, 104px)", lineHeight: ".92", letterSpacing: "-.02em" }}>
<span className="rv"><span>The Living</span></span>
<span className="rv d1"><span><em style={{ color: "#E2B48E" }}>Room Edit</em></span></span>
</h2>
<p className="fade d2" style={{ maxWidth: "400px", margin: "28px 0 36px", fontSize: "16px", lineHeight: "1.7", color: "#E3D5C1" }}>Up to 20% off sofas, lounge chairs and coffee tables — with free standard delivery and easy 7-day returns.</p>
<div className="fade d3" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}><Link href="/shop" className="btn btn-l">Shop the edit</Link></div>
</div>
<div style={{ gridColumn: "7 / span 6" }}>
<div className="clip d1" data-cursor="Shop" style={{ position: "relative", aspectRatio: "5 / 4", overflow: "hidden", borderRadius: "6px", background: "#B98B66" }}>
<div data-speed="0.08" style={{ position: "absolute", left: "0", right: "0", top: "-10%", bottom: "-10%" }}>
<div className="zoom" style={{ position: "absolute", inset: "0" }}><img src="/images/promo-living-edit.jpg" alt="The Living Room Edit: cream sofa, walnut coffee table and terracotta lounge chair" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /></div>
</div>
</div>
</div>
</div>
</section>

{/* WHY CHOOSE US: sticky stacking cards */}
<section id="why" style={{ padding: "160px 0 120px" }}>
<div className="wrap mg" style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: "24px", alignItems: "start" }}>
<div style={{ gridColumn: "span 5", position: "sticky", top: "120px" }}>
<span className="eyebrow fade">(04) — Why choose us</span>
<h2 className="serif" style={{ margin: "18px 0 0", fontWeight: "300", fontSize: "clamp(44px, 5.6vw, 88px)", lineHeight: ".95", letterSpacing: "-.02em" }}>
<span className="rv"><span>Made to be</span></span>
<span className="rv d1"><span><em style={{ color: "#7B4E33" }}>lived with.</em></span></span>
</h2>
<p className="fade d2" style={{ maxWidth: "380px", margin: "28px 0 44px", fontSize: "15px", lineHeight: "1.7", color: "#6A5C4F" }}>From the first click to the day it arrives, every step is built to feel as considered as the furniture itself.</p>
<div className="fade d3" style={{ display: "flex", gap: "40px", flexWrap: "wrap" }}>
<div><div className="serif" style={{ fontSize: "64px", fontWeight: "300", lineHeight: "1" }}><span data-count="10">10</span></div><div className="eyebrow" style={{ marginTop: "8px" }}>Categories</div></div>
<div><div className="serif" style={{ fontSize: "64px", fontWeight: "300", lineHeight: "1" }}><span data-count="7">7</span></div><div className="eyebrow" style={{ marginTop: "8px" }}>Day returns</div></div>
<div><div className="serif" style={{ fontSize: "64px", fontWeight: "300", lineHeight: "1" }}><span data-count="100">100</span>%</div><div className="eyebrow" style={{ marginTop: "8px" }}>Secure checkout</div></div>
</div>
</div>
<div style={{ gridColumn: "7 / span 6", display: "flex", flexDirection: "column", gap: "24px" }}>
<article style={{ position: "sticky", top: "110px", minHeight: "340px", borderRadius: "6px", background: "#E4D6C1", padding: "44px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "40px" }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#231E1A" strokeWidth="1.2" strokeLinejoin="round"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg><span className="serif" style={{ fontSize: "22px" }}>01</span></div>
<div><h3 className="serif" style={{ margin: "0", fontSize: "44px", fontWeight: "400", lineHeight: "1" }}>Secure payment</h3><p style={{ margin: "14px 0 0", fontSize: "15px", lineHeight: "1.7", color: "#4F4338", maxWidth: "440px" }}>Pay by UPI, card, netbanking or wallet through Cashfree. Every payment is verified on our server before your order is confirmed.</p></div>
</article>
<article style={{ position: "sticky", top: "130px", minHeight: "340px", borderRadius: "6px", background: "#D8C3A4", padding: "44px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "40px" }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#231E1A" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg><span className="serif" style={{ fontSize: "22px" }}>02</span></div>
<div><h3 className="serif" style={{ margin: "0", fontSize: "44px", fontWeight: "400", lineHeight: "1" }}>7-day returns</h3><p style={{ margin: "14px 0 0", fontSize: "15px", lineHeight: "1.7", color: "#3F352C", maxWidth: "440px" }}>Live with it for a week. If it isn&apos;t right for your space, we&apos;ll collect it and refund you — no awkward questions.</p></div>
</article>
<article style={{ position: "sticky", top: "150px", minHeight: "340px", borderRadius: "6px", background: "#B98B66", padding: "44px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "40px", color: "#231E1A" }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#231E1A" strokeWidth="1.2" strokeLinejoin="round"><path d="M2 7h11v9H2zM13 10h5l3 3v3h-8z" /><circle cx="6" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></svg><span className="serif" style={{ fontSize: "22px" }}>03</span></div>
<div><h3 className="serif" style={{ margin: "0", fontSize: "44px", fontWeight: "400", lineHeight: "1" }}>Free delivery</h3><p style={{ margin: "14px 0 0", fontSize: "15px", lineHeight: "1.7", color: "#2B231C", maxWidth: "440px" }}>Standard delivery is free in 5–7 days. Need it sooner? Express arrives in 2–3 days for ₹499.</p></div>
</article>
<article style={{ position: "sticky", top: "170px", minHeight: "340px", borderRadius: "6px", background: "#5A3A27", padding: "44px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "40px", color: "#F2E9DC" }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#F2E9DC" strokeWidth="1.2" strokeLinejoin="round"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></svg><span className="serif" style={{ fontSize: "22px" }}>04</span></div>
<div><h3 className="serif" style={{ margin: "0", fontSize: "44px", fontWeight: "400", lineHeight: "1" }}>Track every step</h3><p style={{ margin: "14px 0 0", fontSize: "15px", lineHeight: "1.7", color: "#E3D5C1", maxWidth: "440px" }}>Follow your order from confirmed to packed, shipped, out for delivery and home — all in My Orders.</p></div>
</article>
</div>
</div>
</section>

{/* ROOMS */}
<section id="rooms" style={{ padding: "120px 0 160px" }}>
<div className="wrap">
<div style={{ marginBottom: "80px" }}>
<span className="eyebrow fade">(05) — Shop by room</span>
<h2 className="serif" style={{ margin: "18px 0 0", fontWeight: "300", fontSize: "clamp(44px, 6vw, 96px)", lineHeight: ".95", letterSpacing: "-.02em" }}>
<span className="rv"><span>Three rooms,</span></span>
<span className="rv d1"><span><em style={{ color: "#7B4E33" }}>one quiet language.</em></span></span>
</h2>
</div>
<div style={{ display: "flex", flexDirection: "column", gap: "140px" }}>

<article className="mg" style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: "24px", alignItems: "center" }}>
<div style={{ gridColumn: "span 8" }}>
<Link href="/shop?room=living" className="clip" data-cursor="Shop" aria-label="Shop the living room" style={{ display: "block", position: "relative", aspectRatio: "16 / 10", overflow: "hidden", borderRadius: "6px", background: "#E2D2BB" }}>
<div data-speed="0.08" style={{ position: "absolute", left: "0", right: "0", top: "-10%", bottom: "-10%" }}>
<div className="zoom" style={{ position: "absolute", inset: "0" }}><img src="/images/room-living.jpg" alt="Living room with linen sofa, round oak coffee table, lounge chair and floor lamp" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /></div>
</div>
</Link>
</div>
<div className="room-text" style={{ gridColumn: "10 / span 3" }}>
<span className="serif fade" style={{ fontSize: "22px", color: "#7B4E33" }}>i.</span>
<h3 className="serif" style={{ margin: "10px 0 0", fontSize: "clamp(40px, 4vw, 60px)", fontWeight: "300", lineHeight: "1" }}><span className="rv"><span>Living room</span></span></h3>
<p className="fade d1" style={{ margin: "18px 0 26px", fontSize: "15px", lineHeight: "1.7", color: "#6A5C4F" }}>Deep linen sofas, round oak tables and soft light for long conversations.</p>
<Link href="/shop?room=living" className="ulink fade d2" style={{ fontSize: "12px", letterSpacing: ".16em", textTransform: "uppercase" }}>Shop living →</Link>
</div>
</article>

<article className="mg" style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: "24px", alignItems: "center" }}>
<div className="room-text" style={{ gridColumn: "1 / span 3" }}>
<span className="serif fade" style={{ fontSize: "22px", color: "#7B4E33" }}>ii.</span>
<h3 className="serif" style={{ margin: "10px 0 0", fontSize: "clamp(40px, 4vw, 60px)", fontWeight: "300", lineHeight: "1" }}><span className="rv"><span>Bedroom</span></span></h3>
<p className="fade d1" style={{ margin: "18px 0 26px", fontSize: "15px", lineHeight: "1.7", color: "#6A5C4F" }}>Low platform beds, tall wardrobes and calm, layered textures.</p>
<Link href="/shop?room=bedroom" className="ulink fade d2" style={{ fontSize: "12px", letterSpacing: ".16em", textTransform: "uppercase" }}>Shop bedroom →</Link>
</div>
<div style={{ gridColumn: "5 / span 8" }}>
<Link href="/shop?room=bedroom" className="clip" data-cursor="Shop" aria-label="Shop the bedroom" style={{ display: "block", position: "relative", aspectRatio: "16 / 10", overflow: "hidden", borderRadius: "6px", background: "#DCCDB8" }}>
<div data-speed="0.08" style={{ position: "absolute", left: "0", right: "0", top: "-10%", bottom: "-10%" }}>
<div className="zoom" style={{ position: "absolute", inset: "0" }}><img src="/images/room-bedroom.jpg" alt="Bedroom with walnut platform bed, two-door wardrobe, floor lamp and terracotta pouf" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /></div>
</div>
</Link>
</div>
</article>

<article className="mg" style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: "24px", alignItems: "center" }}>
<div style={{ gridColumn: "span 8" }}>
<Link href="/shop?room=dining" className="clip" data-cursor="Shop" aria-label="Shop the dining room" style={{ display: "block", position: "relative", aspectRatio: "16 / 10", overflow: "hidden", borderRadius: "6px", background: "#E6DACA" }}>
<div data-speed="0.08" style={{ position: "absolute", left: "0", right: "0", top: "-10%", bottom: "-10%" }}>
<div className="zoom" style={{ position: "absolute", inset: "0" }}><img src="/images/room-dining.jpg" alt="Dining room with mango wood table, four sage chairs and a cane sideboard" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /></div>
</div>
</Link>
</div>
<div className="room-text" style={{ gridColumn: "10 / span 3" }}>
<span className="serif fade" style={{ fontSize: "22px", color: "#7B4E33" }}>iii.</span>
<h3 className="serif" style={{ margin: "10px 0 0", fontSize: "clamp(40px, 4vw, 60px)", fontWeight: "300", lineHeight: "1" }}><span className="rv"><span>Dining</span></span></h3>
<p className="fade d1" style={{ margin: "18px 0 26px", fontSize: "15px", lineHeight: "1.7", color: "#6A5C4F" }}>Tables for four or eight, cane sideboards and chairs you&apos;ll linger in.</p>
<Link href="/shop?room=dining" className="ulink fade d2" style={{ fontSize: "12px", letterSpacing: ".16em", textTransform: "uppercase" }}>Shop dining →</Link>
</div>
</article>

</div>
</div>
</section>

{/* REVIEWS */}
<section aria-label="Customer reviews" style={{ padding: "140px 0", background: "#F7F1E8" }}>
<div className="wrap">
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "24px", flexWrap: "wrap", marginBottom: "64px" }}>
<div>
<span className="eyebrow fade">(06) — Customer reviews</span>
<h2 className="serif" style={{ margin: "18px 0 0", fontWeight: "300", fontSize: "clamp(44px, 6vw, 96px)", lineHeight: ".95", letterSpacing: "-.02em" }}>
<span className="rv"><span>From homes</span></span>
<span className="rv d1"><span><em style={{ color: "#7B4E33" }}>we&apos;ve furnished</em></span></span>
</h2>
</div>
</div>
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
<figure className="fade" style={{ margin: "0", padding: "40px", borderTop: "1px solid #231E1A", display: "flex", flexDirection: "column", gap: "28px" }}>
<div style={{ display: "flex", gap: "4px" }} aria-label="5 out of 5 stars"><svg width="16" height="16" viewBox="0 0 24 24" fill="#7B4E33"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg><svg width="16" height="16" viewBox="0 0 24 24" fill="#7B4E33"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg><svg width="16" height="16" viewBox="0 0 24 24" fill="#7B4E33"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg><svg width="16" height="16" viewBox="0 0 24 24" fill="#7B4E33"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg><svg width="16" height="16" viewBox="0 0 24 24" fill="#7B4E33"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg></div>
<blockquote className="serif" style={{ margin: "0", fontSize: "28px", lineHeight: "1.25", fontWeight: "300" }}>“[A real review from a verified buyer — one or two sentences about the piece and the delivery.]”</blockquote>
<figcaption style={{ fontSize: "13px", color: "#6A5C4F", lineHeight: "1.6" }}><strong style={{ color: "#231E1A", fontWeight: "600" }}>[Customer name]</strong> · [City]<br />Verified purchase · [Product]</figcaption>
</figure>
<figure className="fade d1" style={{ margin: "0", padding: "40px", borderTop: "1px solid #231E1A", display: "flex", flexDirection: "column", gap: "28px" }}>
<div style={{ display: "flex", gap: "4px" }} aria-label="5 out of 5 stars"><svg width="16" height="16" viewBox="0 0 24 24" fill="#7B4E33"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg><svg width="16" height="16" viewBox="0 0 24 24" fill="#7B4E33"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg><svg width="16" height="16" viewBox="0 0 24 24" fill="#7B4E33"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg><svg width="16" height="16" viewBox="0 0 24 24" fill="#7B4E33"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg><svg width="16" height="16" viewBox="0 0 24 24" fill="#7B4E33"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg></div>
<blockquote className="serif" style={{ margin: "0", fontSize: "28px", lineHeight: "1.25", fontWeight: "300" }}>“[A real review from a verified buyer — what they love about it after living with it.]”</blockquote>
<figcaption style={{ fontSize: "13px", color: "#6A5C4F", lineHeight: "1.6" }}><strong style={{ color: "#231E1A", fontWeight: "600" }}>[Customer name]</strong> · [City]<br />Verified purchase · [Product]</figcaption>
</figure>
<figure className="fade d2" style={{ margin: "0", padding: "40px", borderTop: "1px solid #231E1A", display: "flex", flexDirection: "column", gap: "28px" }}>
<div style={{ display: "flex", gap: "4px" }} aria-label="5 out of 5 stars"><svg width="16" height="16" viewBox="0 0 24 24" fill="#7B4E33"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg><svg width="16" height="16" viewBox="0 0 24 24" fill="#7B4E33"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg><svg width="16" height="16" viewBox="0 0 24 24" fill="#7B4E33"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg><svg width="16" height="16" viewBox="0 0 24 24" fill="#7B4E33"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg><svg width="16" height="16" viewBox="0 0 24 24" fill="#7B4E33"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg></div>
<blockquote className="serif" style={{ margin: "0", fontSize: "28px", lineHeight: "1.25", fontWeight: "300" }}>“[A real review from a verified buyer — a note on quality, finish or service.]”</blockquote>
<figcaption style={{ fontSize: "13px", color: "#6A5C4F", lineHeight: "1.6" }}><strong style={{ color: "#231E1A", fontWeight: "600" }}>[Customer name]</strong> · [City]<br />Verified purchase · [Product]</figcaption>
</figure>
</div>
</div>
</section>

{/* NEWSLETTER */}
<section aria-label="Newsletter" style={{ padding: "170px 0 150px" }}>
<div className="wrap" style={{ maxWidth: "1000px", textAlign: "center" }}>
<span className="eyebrow fade">(07) — Newsletter</span>
<h2 className="serif" style={{ margin: "20px 0 0", fontWeight: "300", fontSize: "clamp(48px, 7vw, 112px)", lineHeight: ".92", letterSpacing: "-.02em" }}>
<span className="rv"><span>Letters from</span></span>
<span className="rv d1"><span><em style={{ color: "#7B4E33" }}>the workshop</em></span></span>
</h2>
<p className="fade d2" style={{ maxWidth: "460px", margin: "28px auto 44px", fontSize: "16px", lineHeight: "1.7", color: "#6A5C4F" }}>New arrivals, styling notes and early access to every seasonal edit. One email a month, never more.</p>
{subscribed && (<>
<p className="serif" style={{ fontSize: "32px", fontStyle: "italic", color: "#7B4E33", margin: "0" }}>Thank you — see you in your inbox.</p>
</>)}
{notSubscribed && (<>
<form className="fade d3" onSubmit={subscribe} style={{ display: "flex", gap: "16px", alignItems: "flex-end", maxWidth: "620px", margin: "0 auto", flexWrap: "wrap" }}>
<label htmlFor="nl-email" style={{ flex: "1 1 280px", textAlign: "left", fontSize: "12px", letterSpacing: ".16em", textTransform: "uppercase", color: "#6A5C4F" }}>Email address<input id="nl-email" name="email" className="field" type="email" required autoComplete="email" placeholder="you@example.com" style={{ marginTop: "8px" }} /></label>
<button className="btn" type="submit">Subscribe</button>
</form>
{newsletterError && <p role="alert" style={{ margin: "16px 0 0", fontSize: "14px", color: "#8A4626" }}>{newsletterError}</p>}
</>)}
</div>
</section>
</main>
{qvOpen && (<>
<div role="dialog" aria-modal="true" aria-label="Quick view" data-native-scroll="1" style={{ position: "fixed", inset: "0", zIndex: "80", background: "rgba(35,30,26,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", overflowY: "auto" }}>
<div style={{ position: "relative", background: "#F7F1E8", maxWidth: "940px", width: "100%", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", borderRadius: "6px", overflow: "hidden" }}>
<div style={{ position: "relative", minHeight: "420px", background: q.bg }}>
<img src={q.img} alt={q.name} style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
</div>
<div style={{ padding: "44px 40px", display: "flex", flexDirection: "column", gap: "14px" }}>
<span className="eyebrow">{q.catName} · ★ {q.rating}</span>
<h2 className="serif" style={{ margin: "0", fontSize: "42px", fontWeight: "400", lineHeight: "1" }}>{q.name}</h2>
<div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}><span style={{ fontSize: "22px", fontWeight: "600" }}>{q.priceText}</span><s style={{ color: "#6A5C4F" }}>{q.mrpText}</s><span style={{ fontSize: "12px", fontWeight: "600", color: "#8A4626" }}>{q.offText}</span></div>
<p style={{ margin: "0", fontSize: "15px", lineHeight: "1.7", color: "#4F4338" }}>{q.desc}</p>
<dl style={{ margin: "6px 0 10px", display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 20px", fontSize: "14px" }}>
<dt style={{ color: "#6A5C4F" }}>Material</dt><dd style={{ margin: "0" }}>{q.material}</dd>
<dt style={{ color: "#6A5C4F" }}>Dimensions</dt><dd style={{ margin: "0" }}>{q.dims}</dd>
<dt style={{ color: "#6A5C4F" }}>Delivery</dt><dd style={{ margin: "0" }}>Free · 5–7 days</dd>
</dl>
<div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
<button className="btn" onClick={q.add}>Add to cart</button>
<Link href={`/product/${q.id}`} className="btn btn-o">Full details</Link>
</div>
</div>
<button className="ibtn" aria-label="Close quick view" onClick={closeQuick} style={{ position: "absolute", top: "10px", right: "10px", background: "#F7F1E8" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M5 5l14 14M19 5L5 19" /></svg></button>
</div>
</div>
</>)}
    </>
  );
}
