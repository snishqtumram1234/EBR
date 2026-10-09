"use client";

import Script from "next/script";
import { useState } from "react";
import { formatPaise } from "@/lib/money";

type Product = { id: string; name: string; pricePaise: number };

type RazorpaySuccess = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayFailure = {
  error: { code: string; description: string; reason: string; metadata: { order_id: string; payment_id: string } };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: "payment.failed", cb: (r: RazorpayFailure) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

type ApiError = { error: { code: string; message: string } };

export function PayButton({ products }: { products: Product[] }) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function pay() {
    if (!window.Razorpay) {
      setStatus("Payment window is still loading. Try again in a moment.");
      return;
    }
    setBusy(true);
    setStatus("Creating order…");

    const res = await fetch("/api/payment/create-order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: [{ productId, quantity }] }),
    });
    const data = (await res.json()) as
      | { razorpayOrderId: string; amount: number; currency: string; keyId: string }
      | ApiError;
    if (!res.ok || "error" in data) {
      setStatus(`Could not start payment: ${"error" in data ? data.error.message : res.statusText}`);
      setBusy(false);
      return;
    }

    const rzp = new window.Razorpay({
      key: data.keyId,
      amount: data.amount,
      currency: data.currency,
      order_id: data.razorpayOrderId,
      name: "Furniture Store",
      description: "Test order",
      timeout: 25 * 60,
      handler: async (response: RazorpaySuccess) => {
        setStatus("Verifying payment…");
        const v = await fetch("/api/payment/verify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(response),
        });
        const result = (await v.json()) as { status: string; amount?: number } | ApiError;
        if ("error" in result) setStatus(`Payment not verified: ${result.error.message}`);
        else if (result.status === "paid")
          setStatus(`Paid ${formatPaise(result.amount ?? data.amount)}. Payment id ${response.razorpay_payment_id}`);
        else setStatus("Payment received and processing. You'll get a confirmation shortly.");
        setBusy(false);
      },
      modal: {
        ondismiss: () => {
          setStatus("Payment window closed. You can try again.");
          setBusy(false);
        },
      },
    });
    rzp.on("payment.failed", (r) => {
      setStatus(`Payment failed: ${r.error.description}. You can try again.`);
      setBusy(false);
    });
    rzp.open();
  }

  return (
    <div>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <label>
        Product{" "}
        <select value={productId} onChange={(e) => setProductId(e.target.value)}>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}: {formatPaise(p.pricePaise)}
            </option>
          ))}
        </select>
      </label>{" "}
      <label>
        Qty{" "}
        <input
          type="number"
          min={1}
          max={10}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
        />
      </label>{" "}
      <button onClick={pay} disabled={busy}>
        Pay now
      </button>
      <p role="status">{status}</p>
    </div>
  );
}
