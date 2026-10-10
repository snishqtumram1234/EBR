import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { logoutAction } from "@/app/auth/actions";
import { isAdminUser, requireUserPage } from "@/lib/auth/session";

export const metadata: Metadata = { title: "My account — Aurelle" };

export default function AccountPage() {
  return (
    <main>
      <section style={{ padding: "150px 0 140px" }}>
        <div className="wrap" style={{ maxWidth: "720px" }}>
          <span className="eyebrow fade">(01) — My account</span>
          <h1 className="serif" style={{ margin: "18px 0 48px", fontWeight: "300", fontSize: "clamp(54px, 8vw, 104px)", lineHeight: ".92", letterSpacing: "-.02em" }}>
            <span className="rv"><span>Hello,</span></span>
            <span className="rv d1"><span><em style={{ color: "#7B4E33" }}>welcome.</em></span></span>
          </h1>
          <Suspense fallback={null}>
            <Details />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

async function Details() {
  const user = await requireUserPage("/account");
  const admin = await isAdminUser(user.id);
  return (
    <div className="fade">
      <p style={{ margin: "0 0 36px", fontSize: "16px", color: "#6A5C4F" }}>Signed in as <strong style={{ color: "#231E1A" }}>{user.email}</strong></p>
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <Link href="/orders" className="btn">My orders</Link>
        {admin && <Link href="/admin" className="btn btn-o">Owner dashboard</Link>}
        <form action={logoutAction}>
          <button type="submit" className="btn btn-o">Log out</button>
        </form>
      </div>
    </div>
  );
}
