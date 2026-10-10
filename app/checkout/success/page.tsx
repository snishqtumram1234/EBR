import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatPaise } from "@/lib/money";
import { verifyCashfreeOrder, type CashfreeVerification } from "@/lib/payments/cashfree";
import { ClearCartOnPaid } from "./clear-cart";

export const metadata: Metadata = { title: "Order status — Aurelle" };

const ORDER_ID = /^FS_[a-z0-9]+_[a-f0-9]{6}$/;

const METHOD_LABELS: Record<string, string> = {
  upi: "UPI",
  credit_card: "Credit card",
  debit_card: "Debit card",
  net_banking: "Netbanking",
  wallet: "Wallet",
  pay_later: "Pay later",
  cardless_emi: "Cardless EMI",
};

export default function SuccessPage({ searchParams }: PageProps<"/checkout/success">) {
  return (
    <main>
      <section style={{ position: "relative", padding: "150px 0 140px" }}>
        <div className="wrap" style={{ maxWidth: "1000px" }}>
          <Suspense fallback={<Heading eyebrow="Checking" a="Confirming your" b="payment…" />}>
            <Receipt searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

function Heading({ eyebrow, a, b, children }: { eyebrow: string; a: string; b: string; children?: React.ReactNode }) {
  return (
    <div style={{ textAlign: "center" }}>
      <span className="eyebrow fade">{eyebrow}</span>
      <h1 className="serif" style={{ margin: "20px 0 0", fontWeight: "300", fontSize: "clamp(48px, 7vw, 112px)", lineHeight: ".92", letterSpacing: "-.02em" }}>
        <span className="rv"><span>{a}</span></span>
        <span className="rv d1"><span><em style={{ color: "#7B4E33" }}>{b}</em></span></span>
      </h1>
      {children}
    </div>
  );
}

async function Receipt({ searchParams }: { searchParams: PageProps<"/checkout/success">["searchParams"] }) {
  // Payment status must be fetched fresh on every request, never prerendered.
  await connection();
  const raw = (await searchParams).order_id;
  const orderId = typeof raw === "string" ? raw : "";
  if (!ORDER_ID.test(orderId)) {
    return <Problem eyebrow="Order not found" a="We couldn't find" b="that order." message="This link doesn't point to a valid order." />;
  }

  let result: CashfreeVerification;
  try {
    // Server-to-Cashfree check: the browser's word is never taken for payment status.
    result = await verifyCashfreeOrder(orderId);
  } catch {
    return <Problem eyebrow="Please wait" a="We couldn't check" b="your payment." message="Please refresh this page in a moment." orderId={orderId} />;
  }

  if (result.status === "failed") {
    return <Problem eyebrow="Payment not completed" a="No money" b="was taken." message={`${result.message} Your bag is saved, so you can try again.`} orderId={orderId} retry />;
  }
  if (result.status === "pending") {
    return (
      <Heading eyebrow="Payment processing" a="Almost" b="there.">
        <p className="fade d2" style={{ maxWidth: "460px", margin: "28px auto 44px", fontSize: "16px", lineHeight: "1.7", color: "#6A5C4F" }}>
          Your bank hasn&apos;t confirmed yet. This usually takes under a minute.
        </p>
        <Link className="btn fade d3" href={`/checkout/success?order_id=${orderId}`}>Check again</Link>
      </Heading>
    );
  }

  const tags = result.order.order_tags ?? {};
  const customer = result.order.customer_details;
  const firstName = customer?.customer_name?.split(" ")[0];
  const shipping = Number(tags.shipping_paise ?? 0);
  const subtotal = Number(tags.subtotal_paise ?? result.amountPaise);
  const gst = Number(tags.gst_paise ?? 0);

  return (
    <>
      <ClearCartOnPaid />
      <Heading eyebrow={`Order ${orderId}`} a={firstName ? `Thank you, ${firstName}.` : "Thank you."} b="It's on its way home.">
        <p className="fade d2" style={{ maxWidth: "480px", margin: "28px auto 0", fontSize: "16px", lineHeight: "1.7", color: "#6A5C4F" }}>
          We&apos;ve received your payment of <strong style={{ color: "#231E1A" }}>{formatPaise(result.amountPaise)}</strong>. We&apos;ll keep you posted at every step.
        </p>
      </Heading>

      <div className="fade d3 mg" style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: "24px", marginTop: "88px", alignItems: "start" }}>
        <dl style={{ gridColumn: "span 6", margin: "0", display: "grid", gridTemplateColumns: "auto 1fr", gap: "16px 28px", fontSize: "15px", padding: "40px 0 0", borderTop: "1px solid #231E1A" }}>
          <dt className="eyebrow">Items</dt><dd style={{ margin: "0" }}>{tags.items ?? "Your items"}</dd>
          <dt className="eyebrow">Paid with</dt><dd style={{ margin: "0" }}>{METHOD_LABELS[result.method ?? ""] ?? result.method ?? "Cashfree"}</dd>
          <dt className="eyebrow">Payment ID</dt><dd style={{ margin: "0", overflowWrap: "anywhere" }}>{result.cfPaymentId}</dd>
          {tags.delivery && (<><dt className="eyebrow">Delivery</dt><dd style={{ margin: "0" }}>{tags.delivery}</dd></>)}
          {(tags.ship_to || tags.city) && (
            <>
              <dt className="eyebrow">Ship to</dt>
              <dd style={{ margin: "0", lineHeight: "1.6" }}>
                {customer?.customer_name}<br />{tags.ship_to}<br />{tags.city}
              </dd>
            </>
          )}
        </dl>

        <div style={{ gridColumn: "8 / span 5", background: "#F7F1E8", borderRadius: "6px", padding: "40px 36px" }}>
          <span className="eyebrow">Receipt</span>
          <dl style={{ margin: "28px 0 0", display: "flex", flexDirection: "column", gap: "14px", fontSize: "15px" }}>
            <Row label="Subtotal" value={formatPaise(subtotal)} />
            <Row label="Delivery" value={shipping === 0 ? "Free" : formatPaise(shipping)} />
          </dl>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px", marginTop: "24px", paddingTop: "24px", borderTop: "1px solid #231E1A" }}>
            <span className="eyebrow" style={{ color: "#231E1A" }}>Total paid</span>
            <span className="serif" style={{ fontSize: "44px", lineHeight: "1" }}>{formatPaise(result.amountPaise)}</span>
          </div>
          {gst > 0 && <p style={{ margin: "8px 0 0", textAlign: "right", fontSize: "12px", color: "#6A5C4F" }}>Includes GST (18%) of {formatPaise(gst)}</p>}
          <Link href="/shop" className="btn" style={{ width: "100%", marginTop: "28px" }}>Continue shopping</Link>
        </div>
      </div>
    </>
  );
}

function Problem({ eyebrow, a, b, message, orderId, retry }: { eyebrow: string; a: string; b: string; message: string; orderId?: string; retry?: boolean }) {
  return (
    <Heading eyebrow={eyebrow} a={a} b={b}>
      <p className="fade d2" style={{ maxWidth: "460px", margin: "28px auto 12px", fontSize: "16px", lineHeight: "1.7", color: "#6A5C4F" }}>{message}</p>
      {orderId && <p className="eyebrow fade d2" style={{ margin: "0 0 40px" }}>Order {orderId}</p>}
      <div className="fade d3" style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", marginTop: orderId ? "0" : "28px" }}>
        <Link className="btn" href="/checkout">{retry ? "Try again" : "Back to your bag"}</Link>
        <Link className="btn btn-o" href="/shop">Keep shopping</Link>
      </div>
    </Heading>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
      <dt style={{ color: "#6A5C4F" }}>{label}</dt>
      <dd style={{ margin: "0", fontWeight: "500" }}>{value}</dd>
    </div>
  );
}
