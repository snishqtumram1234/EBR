import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdminPage } from "@/lib/auth/session";
import { adminCounts } from "@/lib/data/orders";

export const metadata: Metadata = { title: "Owner dashboard — Aurelle", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <main>
      <section style={{ padding: "130px 0 140px" }}>
        <div className="wrap">
          <Suspense fallback={<p className="eyebrow">Loading…</p>}>
            <Shell>{children}</Shell>
          </Suspense>
        </div>
      </section>
    </main>
  );
}

// Every admin page also calls requireAdminPage() itself: a layout check alone is not enough.
async function Shell({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  const counts = await adminCounts();
  return (
    <>
      <AdminNav awaiting={counts.awaiting} review={counts.review} />
      {children}
    </>
  );
}
