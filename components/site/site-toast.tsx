"use client";

import Link from "next/link";
import { useStore } from "@/components/store/store-provider";

/** "Added to cart" toast, from the design. */
export function SiteToast() {
  const { toast } = useStore();
  if (!toast) return null;
  return (
    <div role="status" style={{ position: "fixed", left: "50%", bottom: "28px", zIndex: "90", transform: "translateX(-50%)", background: "#231E1A", color: "#F7F1E8", padding: "14px 18px 14px 22px", borderRadius: "999px", display: "flex", alignItems: "center", gap: "16px", fontSize: "14px", boxShadow: "0 18px 50px rgba(35,30,26,.25)", whiteSpace: "nowrap" }}>
      <span>{toast}</span>
      <Link href="/checkout" style={{ color: "#E2B48E", fontSize: "12px", letterSpacing: ".14em", textTransform: "uppercase" }}>View cart</Link>
    </div>
  );
}
