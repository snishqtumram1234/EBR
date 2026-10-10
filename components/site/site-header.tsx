"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/components/store/store-provider";

/** Header and mobile menu, from the design. Section links scroll in place on the home page. */
export function SiteHeader() {
  const { cartCount, likedCount } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const isHome = usePathname() === "/";
  const sec = (hash: string) => (isHome ? hash : `/${hash}`);
  const openMenu = () => setMenuOpen(true);
  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className="nav" style={{ position: "fixed", top: "0", left: "0", right: "0", zIndex: "50" }}>
        <div style={{ maxWidth: "1440px", margin: "0 auto", padding: "14px clamp(20px,4vw,56px)", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "16px" }}>
          <nav className="nav-links" aria-label="Primary" style={{ display: "flex", gap: "30px", fontSize: "12px", letterSpacing: ".16em", textTransform: "uppercase" }}>
            <Link href="/shop" className="ulink">Shop</Link>
            <a href={sec("#featured")} className="ulink">Collections</a>
            <a href={sec("#rooms")} className="ulink">Rooms</a>
            <a href={sec("#why")} className="ulink">Our craft</a>
          </nav>
          <button className="ibtn menu-btn" aria-label="Open menu" onClick={openMenu}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 8h18M3 16h18" /></svg>
          </button>
          {isHome ? (
            <a href="#top" className="serif" style={{ fontSize: "28px", letterSpacing: ".3em", textDecoration: "none", color: "#231E1A", fontWeight: "500", paddingLeft: ".3em" }}>AURELLE</a>
          ) : (
            <Link href="/" className="serif" style={{ fontSize: "28px", letterSpacing: ".3em", textDecoration: "none", color: "#231E1A", fontWeight: "500", paddingLeft: ".3em" }}>AURELLE</Link>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "2px" }}>
            <Link href="/shop" className="ibtn" aria-label="Search furniture"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg></Link>
            <a href="#" className="ibtn hide-sm" aria-label="Account"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg></a>
            <Link href="/shop?saved=1" className="ibtn hide-sm" aria-label={`Wishlist, ${likedCount} saved`}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg></Link>
            <Link href="/checkout" className="ibtn" aria-label={`Cart, ${cartCount} items`}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg><span style={{ position: "absolute", top: "4px", right: "2px", minWidth: "18px", height: "18px", borderRadius: "9px", background: "#7B4E33", color: "#F7F1E8", fontSize: "10px", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>{cartCount}</span></Link>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div role="dialog" aria-modal="true" aria-label="Menu" style={{ position: "fixed", inset: "0", zIndex: "70", background: "#231E1A", color: "#EFE6D8", padding: "24px", display: "flex", flexDirection: "column", gap: "28px" }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}><button className="ibtn" aria-label="Close menu" onClick={closeMenu} style={{ color: "#EFE6D8" }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M5 5l14 14M19 5L5 19" /></svg></button></div>
          <nav aria-label="Mobile" className="serif" style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "48px", fontWeight: "300" }}>
            <Link href="/shop" onClick={closeMenu} style={{ color: "#EFE6D8", textDecoration: "none" }}>Shop</Link>
            <a href={sec("#featured")} onClick={closeMenu} style={{ color: "#EFE6D8", textDecoration: "none" }}>Collections</a>
            <a href={sec("#rooms")} onClick={closeMenu} style={{ color: "#EFE6D8", textDecoration: "none" }}>Rooms</a>
            <a href={sec("#why")} onClick={closeMenu} style={{ color: "#EFE6D8", textDecoration: "none" }}>Our craft</a>
            <Link href="/checkout" onClick={closeMenu} style={{ color: "#EFE6D8", textDecoration: "none" }}>Cart ({cartCount})</Link>
          </nav>
        </div>
      )}
    </>
  );
}
