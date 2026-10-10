import { formatDateTime } from "@/lib/format-date";
import type { HistoryRow, OrderStatus } from "@/lib/data/types";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Order placed",
  confirmed: "Payment confirmed",
  processing: "Being prepared",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const TONE = {
  ok: { bg: "#E3EBDD", fg: "#35502B" },
  wait: { bg: "#F3E5CC", fg: "#7A5217" },
  bad: { bg: "#F2DED3", fg: "#8A2E1C" },
} as const;

export function StagePill({ label, tone }: { label: string; tone: keyof typeof TONE }) {
  return (
    <span style={{ display: "inline-block", padding: "6px 12px", borderRadius: "999px", background: TONE[tone].bg, color: TONE[tone].fg, fontSize: "11px", fontWeight: "600", letterSpacing: ".1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

/** Vertical tracking timeline built from order_status_history. */
export function Timeline({ history }: { history: HistoryRow[] }) {
  return (
    <ol style={{ listStyle: "none", margin: "0", padding: "0" }}>
      {history.map((h, i) => {
        const last = i === history.length - 1;
        // A second row with the same status is a payment update, not a repeat of the first step.
        const label = i > 0 && history[i - 1].status === h.status ? "Payment update" : STATUS_LABEL[h.status];
        return (
          <li key={h.id} style={{ display: "grid", gridTemplateColumns: "20px 1fr", gap: "16px", paddingBottom: last ? "0" : "28px", position: "relative" }}>
            <span aria-hidden="true" style={{ width: "11px", height: "11px", marginTop: "7px", borderRadius: "50%", background: last ? "#7B4E33" : "#231E1A", boxShadow: last ? "0 0 0 5px rgba(123,78,51,.18)" : "none" }} />
            {!last && <span aria-hidden="true" style={{ position: "absolute", left: "5px", top: "22px", bottom: "0", width: "1px", background: "rgba(35,30,26,.25)" }} />}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
                <span className="serif" style={{ fontSize: "24px", lineHeight: "1.2" }}>{label}</span>
                <span style={{ fontSize: "13px", color: "#6A5C4F" }}>{formatDateTime(h.created_at)}</span>
              </div>
              {h.note && h.note !== label && <p style={{ margin: "4px 0 0", fontSize: "14px", lineHeight: "1.6", color: "#6A5C4F" }}>{h.note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
