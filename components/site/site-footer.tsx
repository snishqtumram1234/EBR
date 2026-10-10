import Link from "next/link";

/** Footer, from the design. */
export function SiteFooter() {
  return (
    <footer style={{ background: "#231E1A", color: "#E3D5C1", padding: "110px 0 36px", overflow: "hidden" }}>
      <div className="wrap">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "40px", paddingBottom: "80px" }}>
          <div>
            <div className="serif" style={{ fontSize: "30px", letterSpacing: ".3em", color: "#F2E9DC" }}>AURELLE</div>
            <p style={{ margin: "18px 0 0", fontSize: "14px", lineHeight: "1.7", color: "#CDBBA4", maxWidth: "260px" }}>Furniture that makes your space feel like home.</p>
          </div>
          <nav aria-label="Shop links" style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px" }}>
            <span className="eyebrow" style={{ color: "#B9A58B", marginBottom: "6px" }}>Shop</span>
            <Link href="/shop?cat=sofa" style={{ color: "#E3D5C1", textDecoration: "none" }}>Sofas &amp; chairs</Link>
            <Link href="/shop?cat=bed" style={{ color: "#E3D5C1", textDecoration: "none" }}>Beds &amp; wardrobes</Link>
            <Link href="/shop?cat=dining" style={{ color: "#E3D5C1", textDecoration: "none" }}>Dining</Link>
            <Link href="/shop?cat=tv" style={{ color: "#E3D5C1", textDecoration: "none" }}>Storage &amp; TV units</Link>
            <Link href="/shop?cat=decor" style={{ color: "#E3D5C1", textDecoration: "none" }}>Home décor</Link>
          </nav>
          <nav aria-label="Help links" style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px" }}>
            <span className="eyebrow" style={{ color: "#B9A58B", marginBottom: "6px" }}>Help</span>
            <Link href="/checkout" style={{ color: "#E3D5C1", textDecoration: "none" }}>Track my order</Link>
            <a href="#" style={{ color: "#E3D5C1", textDecoration: "none" }}>Delivery</a>
            <a href="#" style={{ color: "#E3D5C1", textDecoration: "none" }}>Returns &amp; refunds</a>
            <a href="#" style={{ color: "#E3D5C1", textDecoration: "none" }}>FAQ</a>
          </nav>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px", lineHeight: "1.6" }}>
            <span className="eyebrow" style={{ color: "#B9A58B", marginBottom: "6px" }}>Visit &amp; contact</span>
            <span>[Showroom address]</span>
            <span>[Phone number]</span>
            <span>[Email address]</span>
          </div>
        </div>
        <div aria-hidden="true" className="serif" style={{ display: "flex", justifyContent: "space-between", fontSize: "clamp(72px, 17vw, 270px)", fontWeight: "300", lineHeight: ".8", color: "#F2E9DC", letterSpacing: "-.01em" }}>
          <span className="rv"><span>A</span></span><span className="rv d1"><span>U</span></span><span className="rv d2"><span>R</span></span><span className="rv d3"><span>E</span></span><span className="rv d4"><span>L</span></span><span className="rv d5"><span>L</span></span><span className="rv d5"><span>E</span></span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginTop: "44px", paddingTop: "24px", borderTop: "1px solid rgba(227,213,193,.2)", fontSize: "12px", color: "#B9A58B", letterSpacing: ".06em" }}>
          <span>© 2026 Aurelle Living</span>
          <span>Payments secured by Cashfree · UPI · Cards · Netbanking</span>
          <a href="#top" style={{ color: "#E3D5C1" }}>Back to top ↑</a>
        </div>
      </div>
    </footer>
  );
}
