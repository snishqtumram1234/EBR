import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireUserPage } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { syncCashfreePayment } from "@/lib/orders/service";

export const metadata: Metadata = { title: "Confirming your payment — Aurelle" };

const ORDER_NUMBER = /^ORD-[0-9]{3,12}$/;

/**
 * Where Cashfree sends the customer after paying (and where the bag sends
 * them after closing the payment window). It asks Cashfree for the real
 * result, records it, then moves on to the order page.
 */
export default function CheckoutSuccessPage({ searchParams }: PageProps<"/checkout/success">) {
  return (
    <main>
      <section style={{ padding: "150px 0 140px" }}>
        <div className="wrap" style={{ maxWidth: "1000px", textAlign: "center" }}>
          <span className="eyebrow">Checking</span>
          <h1 className="serif" style={{ margin: "20px 0 0", fontWeight: "300", fontSize: "clamp(48px, 7vw, 112px)", lineHeight: ".92", letterSpacing: "-.02em" }}>
            Confirming your <em style={{ color: "#7B4E33" }}>payment…</em>
          </h1>
          <Suspense fallback={null}>
            <Resolve searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

async function Resolve({ searchParams }: { searchParams: PageProps<"/checkout/success">["searchParams"] }): Promise<React.ReactNode> {
  await connection(); // payment status is always fetched fresh
  const raw = (await searchParams).order_id;
  const orderNumber = typeof raw === "string" ? raw : "";
  if (!ORDER_NUMBER.test(orderNumber)) redirect("/orders");

  const user = await requireUserPage(`/checkout/success?order_id=${orderNumber}`);
  try {
    // Server-to-Cashfree check: the browser's word is never taken for payment status.
    await syncCashfreePayment(orderNumber, user.id);
  } catch (err) {
    // Even if the check fails, the order page shows the true state from our database.
    logger.warn("checkout.success_sync_failed", { orderNumber, err: err instanceof Error ? err.message : "unknown" });
  }
  redirect(`/orders/${orderNumber}?placed=1`);
}
