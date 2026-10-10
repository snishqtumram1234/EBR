"use client";

import { MAX_LINE_QUANTITY } from "@/lib/config";

/** Pill quantity stepper in the design's button language. */
export function Stepper({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  const btn = { width: "44px", height: "48px", border: "0", background: "transparent", color: "#231E1A", fontSize: "18px", cursor: "pointer" } as const;
  return (
    <div role="group" aria-label={`Quantity of ${label}`} style={{ display: "inline-flex", alignItems: "center", border: "1px solid #231E1A", borderRadius: "999px", minHeight: "50px" }}>
      <button type="button" style={btn} onClick={() => onChange(Math.max(1, value - 1))} aria-label="Decrease quantity" disabled={value <= 1}>−</button>
      <span aria-live="polite" style={{ minWidth: "24px", textAlign: "center", fontWeight: "600" }}>{value}</span>
      <button type="button" style={btn} onClick={() => onChange(Math.min(MAX_LINE_QUANTITY, value + 1))} aria-label="Increase quantity" disabled={value >= MAX_LINE_QUANTITY}>+</button>
    </div>
  );
}
