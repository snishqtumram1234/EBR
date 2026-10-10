"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Lets a customer send (or correct) the 12-digit UPI reference after paying. */
export function UpiReferenceForm({ reference, rejectedReason }: { reference: string; rejectedReason?: string | null }) {
  const router = useRouter();
  const [utr, setUtr] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/payment/upi/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reference, utr }),
      });
      const body = (await res.json()) as { error?: { message: string } };
      if (!res.ok) setError(body.error?.message ?? "Could not submit. Please try again.");
      else router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      {rejectedReason && (
        <p role="alert" style={{ margin: "0", padding: "12px 16px", borderRadius: "6px", background: "#F2DED3", color: "#8A2E1C", fontSize: "14px", lineHeight: "1.5" }}>
          We couldn&apos;t match your payment: {rejectedReason}. Check the reference and send it again.
        </p>
      )}
      <label style={{ display: "block", fontSize: "12px", letterSpacing: ".16em", textTransform: "uppercase", color: "#6A5C4F" }}>
        12-digit UTR from your UPI app
        <input className="field" inputMode="numeric" maxLength={12} value={utr} onChange={(e) => setUtr(e.target.value.replace(/\D/g, ""))} placeholder="123456789012" style={{ marginTop: "8px" }} />
      </label>
      {error && <p role="alert" style={{ margin: "0", fontSize: "14px", color: "#8A2E1C" }}>{error}</p>}
      <button className="btn" type="submit" disabled={busy || utr.length !== 12} style={{ opacity: busy || utr.length !== 12 ? ".6" : "1" }}>
        {busy ? "Sending…" : "Send reference"}
      </button>
    </form>
  );
}
