import { DEMO_PRODUCTS } from "@/lib/payments/demo-catalog";
import { PayButton } from "./pay-button";

// Unstyled placeholder proving the payment flows end to end.
export default function PayDemoPage() {
  const products = DEMO_PRODUCTS.map(({ id, name, pricePaise }) => ({ id, name, pricePaise }));
  return (
    <main>
      <h1>Checkout demo</h1>
      <p>
        <strong>Cashfree (sandbox, no real money):</strong> choose UPI and enter{" "}
        <code>testsuccess@gocash</code> (or <code>testfailure@gocash</code> to see a failure). Card:
        4706 1312 1121 2123, expiry 03/28, CVV 123, OTP 111000.
      </p>
      <p>
        <strong>Razorpay (test mode, no real money):</strong> card 4100 2800 0000 1007, any future
        expiry, any CVV, any 4 to 10 digit OTP.
      </p>
      <p>
        <strong>UPI QR (direct):</strong> a real QR for the store&apos;s UPI ID. Scanning it moves
        real money, so use the ₹1 test item.
      </p>
      <PayButton products={products} />
    </main>
  );
}
