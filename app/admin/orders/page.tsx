import Link from "next/link";
import { Suspense } from "react";
import { OrderTable } from "@/components/admin/order-table";
import { requireAdminPage } from "@/lib/auth/session";
import { adminCounts, adminListOrders, type AdminFilter } from "@/lib/data/orders";

const TABS: { key: AdminFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "awaiting", label: "Awaiting payment" },
  { key: "to_ship", label: "To prepare" },
  { key: "shipped", label: "On the way" },
  { key: "done", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
  { key: "review", label: "Needs review" },
];

export default function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  return (
    <Suspense fallback={null}>
      <Orders searchParams={searchParams} />
    </Suspense>
  );
}

async function Orders({ searchParams }: { searchParams: PageProps<"/admin/orders">["searchParams"] }) {
  await requireAdminPage();
  const sp = await searchParams;
  const f = (TABS.some((t) => t.key === sp.f) ? sp.f : "all") as AdminFilter;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 20) : "";
  const [orders, counts] = await Promise.all([adminListOrders(f, q), adminCounts()]);

  return (
    <>
      <span className="eyebrow">(02) — Orders</span>
      <h1 className="serif" style={{ margin: "18px 0 40px", fontWeight: "300", fontSize: "clamp(48px, 6vw, 96px)", lineHeight: ".95", letterSpacing: "-.02em" }}>
        Every <em style={{ color: "#7B4E33" }}>order.</em>
      </h1>

      <div role="tablist" aria-label="Order filters" style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "28px" }}>
        {TABS.map((t) => {
          const active = t.key === f;
          return (
            <Link key={t.key} role="tab" aria-selected={active} href={t.key === "all" ? "/admin/orders" : `/admin/orders?f=${t.key}`} style={{ minHeight: "44px", padding: "0 20px", borderRadius: "999px", border: "1px solid #231E1A", background: active ? "#231E1A" : "transparent", color: active ? "#F7F1E8" : "#231E1A", font: "500 12px var(--font-manrope), Manrope, sans-serif", letterSpacing: ".14em", textTransform: "uppercase", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" }}>
              {t.label}
              <span style={{ opacity: ".7" }}>{counts[t.key]}</span>
            </Link>
          );
        })}
      </div>

      <form action="/admin/orders" style={{ display: "flex", gap: "12px", alignItems: "flex-end", marginBottom: "40px", maxWidth: "520px" }}>
        {f !== "all" && <input type="hidden" name="f" value={f} />}
        <label style={{ flex: "1", fontSize: "12px", letterSpacing: ".16em", textTransform: "uppercase", color: "#6A5C4F" }}>
          Find an order number
          <input className="field" name="q" defaultValue={q} placeholder="ORD-10001" style={{ marginTop: "8px" }} />
        </label>
        <button className="btn btn-o" type="submit">Search</button>
      </form>

      <OrderTable orders={orders} empty="No orders match." />
    </>
  );
}
