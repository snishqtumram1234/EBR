import Link from "next/link";

const pill = { minHeight: "44px", padding: "0 22px", borderRadius: "999px", border: "1px solid #231E1A", background: "transparent", color: "#231E1A", font: "500 12px var(--font-manrope), Manrope, sans-serif", letterSpacing: ".14em", textTransform: "uppercase", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" } as const;

export function AdminNav({ awaiting, review }: { awaiting: number; review: number }) {
  return (
    <nav aria-label="Owner" style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "56px" }}>
      <Link href="/admin" style={pill}>Overview</Link>
      <Link href="/admin/orders" style={pill}>All orders</Link>
      <Link href="/admin/orders?f=awaiting" style={pill}>
        Awaiting payment
        {awaiting > 0 && <span style={{ background: "#7B4E33", color: "#F7F1E8", borderRadius: "999px", padding: "2px 8px", fontSize: "10px" }}>{awaiting}</span>}
      </Link>
      {review > 0 && (
        <Link href="/admin/orders?f=review" style={{ ...pill, borderColor: "#8A2E1C", color: "#8A2E1C" }}>
          Needs review
          <span style={{ background: "#8A2E1C", color: "#F7F1E8", borderRadius: "999px", padding: "2px 8px", fontSize: "10px" }}>{review}</span>
        </Link>
      )}
    </nav>
  );
}
