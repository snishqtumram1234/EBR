import Link from "next/link";
import { Suspense } from "react";
import { OrderTable } from "@/components/admin/order-table";
import { requireAdminPage } from "@/lib/auth/session";
import { adminCounts, adminListOrders } from "@/lib/data/orders";

export default function AdminHome() {
  return (
    <Suspense fallback={null}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  await requireAdminPage();
  const [counts, awaiting] = await Promise.all([adminCounts(), adminListOrders("awaiting")]);
  const toVerify = awaiting.filter((o) => o.payments.some((p) => p.provider === "upi" && p.utr));

  const tiles: { label: string; value: number; href: string }[] = [
    { label: "UPI payments to verify", value: toVerify.length, href: "/admin/orders?f=awaiting" },
    { label: "Ready to prepare", value: counts.to_ship, href: "/admin/orders?f=to_ship" },
    { label: "On the way", value: counts.shipped, href: "/admin/orders?f=shipped" },
    { label: "Delivered", value: counts.done, href: "/admin/orders?f=done" },
  ];

  return (
    <>
      <span className="eyebrow">(01) — Owner dashboard</span>
      <h1 className="serif" style={{ margin: "18px 0 56px", fontWeight: "300", fontSize: "clamp(54px, 8vw, 120px)", lineHeight: ".92", letterSpacing: "-.02em" }}>
        <span className="rv"><span>The</span></span>
        <span className="rv d1"><span><em style={{ color: "#7B4E33" }}>shop floor.</em></span></span>
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "88px" }}>
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="card" style={{ background: "#F7F1E8", borderRadius: "6px", padding: "28px", textDecoration: "none", color: "#231E1A" }}>
            <div className="serif" style={{ fontSize: "64px", fontWeight: "300", lineHeight: "1" }}>{t.value}</div>
            <div className="eyebrow" style={{ marginTop: "10px" }}>{t.label}</div>
          </Link>
        ))}
      </div>

      <h2 className="serif" style={{ margin: "0 0 24px", fontWeight: "300", fontSize: "clamp(32px, 3vw, 44px)" }}>
        Payments waiting for <em style={{ color: "#7B4E33" }}>you.</em>
      </h2>
      <OrderTable orders={toVerify} empty="Nothing to verify right now. New UPI payments appear here once the customer sends their reference." />
    </>
  );
}
