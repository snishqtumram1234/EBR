import { DEMO_PRODUCTS } from "@/lib/payments/demo-catalog";
import { PayButton } from "./pay-button";

// Unstyled placeholder proving the Razorpay flow end to end (test mode).
export default function PayDemoPage() {
  const products = DEMO_PRODUCTS.map(({ id, name, pricePaise }) => ({ id, name, pricePaise }));
  return (
    <main>
      <h1>Checkout demo</h1>
      <p>
        <strong>UPI:</strong> a real UPI QR code for the store&apos;s UPI ID. Scanning it moves real
        money, so use the ₹1 test item.
      </p>
      <p>
        <strong>Card / netbanking:</strong> Razorpay test mode, no real money. Use card 4100 2800 0000
        1007 (any future expiry, any CVV, any 4 to 10 digit OTP).
      </p>
      <PayButton products={products} />
    </main>
  );
}
