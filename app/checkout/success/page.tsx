import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { formatPaise } from "@/lib/money";
import { verifyCashfreeOrder, type CashfreeVerification } from "@/lib/payments/cashfree";
import base from "../checkout.module.css";
import styles from "./success.module.css";

export const metadata: Metadata = { title: "Order status · Furniture Store" };

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
    <div className={base.page}>
      <header className={base.header}>
        <span className={base.brand}>Furniture Store</span>
      </header>
      <main className={styles.wrap}>
        <Suspense fallback={<p className={styles.checking}>Confirming your payment with Cashfree…</p>}>
          <Receipt searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}

async function Receipt({ searchParams }: { searchParams: PageProps<"/checkout/success">["searchParams"] }) {
  const raw = (await searchParams).order_id;
  const orderId = typeof raw === "string" ? raw : "";
  if (!ORDER_ID.test(orderId)) {
    return <Problem title="Order not found" message="This link doesn't point to a valid order." />;
  }

  let result: CashfreeVerification;
  try {
    // Server-to-Cashfree check: the browser's word is never taken for payment status.
    result = await verifyCashfreeOrder(orderId);
  } catch {
    return <Problem title="We couldn't check your payment" message="Please refresh this page in a moment." orderId={orderId} />;
  }

  if (result.status === "failed") {
    return <Problem title="Payment not completed" message={`${result.message} No money has been taken.`} orderId={orderId} retry />;
  }
  if (result.status === "pending") {
    return (
      <section className={`${base.card} ${styles.card}`}>
        <div className={`${styles.badge} ${styles.pending}`} aria-hidden="true">…</div>
        <h1 className={styles.title}>Payment processing</h1>
        <p className={styles.lead}>Your bank hasn&apos;t confirmed yet. This usually takes under a minute.</p>
        <Link className={styles.secondary} href={`/checkout/success?order_id=${orderId}`}>
          Check again
        </Link>
      </section>
    );
  }

  const tags = result.order.order_tags ?? {};
  const customer = result.order.customer_details;
  const shipping = Number(tags.shipping_paise ?? 0);
  const subtotal = Number(tags.subtotal_paise ?? result.amountPaise);
  const gst = Number(tags.gst_paise ?? 0);

  return (
    <section className={`${base.card} ${styles.card}`}>
      <div className={`${styles.badge} ${styles.ok}`} aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </div>
      <h1 className={styles.title}>Order confirmed</h1>
      <p className={styles.lead}>
        Thank you{customer?.customer_name ? `, ${customer.customer_name.split(" ")[0]}` : ""}! We&apos;ve received your
        payment of <strong>{formatPaise(result.amountPaise)}</strong>.
      </p>

      <dl className={styles.facts}>
        <div>
          <dt>Order ID</dt>
          <dd className={styles.mono}>{orderId}</dd>
        </div>
        <div>
          <dt>Paid with</dt>
          <dd>{METHOD_LABELS[result.method ?? ""] ?? result.method ?? "Cashfree"}</dd>
        </div>
        <div>
          <dt>Payment ID</dt>
          <dd className={styles.mono}>{result.cfPaymentId}</dd>
        </div>
        {tags.delivery && (
          <div>
            <dt>Delivery</dt>
            <dd>{tags.delivery}</dd>
          </div>
        )}
      </dl>

      <div className={styles.block}>
        <h2>Items</h2>
        <p>{tags.items ?? "Your items"}</p>
      </div>

      {(tags.ship_to || tags.city) && (
        <div className={styles.block}>
          <h2>Shipping to</h2>
          <p>
            {customer?.customer_name}
            <br />
            {tags.ship_to}
            <br />
            {tags.city}
          </p>
        </div>
      )}

      <dl className={base.totals}>
        <div>
          <dt>Subtotal</dt>
          <dd>{formatPaise(subtotal)}</dd>
        </div>
        <div>
          <dt>Delivery</dt>
          <dd>{shipping === 0 ? <span className={base.free}>FREE</span> : formatPaise(shipping)}</dd>
        </div>
        <div className={base.grand}>
          <dt>Total paid</dt>
          <dd>{formatPaise(result.amountPaise)}</dd>
        </div>
        {gst > 0 && (
          <div className={base.gst}>
            <dt>Includes GST (18%)</dt>
            <dd>{formatPaise(gst)}</dd>
          </div>
        )}
      </dl>

      <Link className={base.payButton} href="/checkout">
        Continue shopping
      </Link>
    </section>
  );
}

function Problem({ title, message, orderId, retry }: { title: string; message: string; orderId?: string; retry?: boolean }) {
  return (
    <section className={`${base.card} ${styles.card}`}>
      <div className={`${styles.badge} ${styles.bad}`} aria-hidden="true">!</div>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.lead}>{message}</p>
      {orderId && <p className={`${styles.mono} ${base.muted}`}>Order {orderId}</p>}
      <Link className={base.payButton} href="/checkout">
        {retry ? "Try again" : "Back to checkout"}
      </Link>
    </section>
  );
}
