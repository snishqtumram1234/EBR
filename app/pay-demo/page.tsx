import { DEMO_PRODUCTS } from "@/lib/payments/demo-catalog";
import { PayButton } from "./pay-button";

// Unstyled placeholder proving the Razorpay flow end to end (test mode).
export default function PayDemoPage() {
  const products = DEMO_PRODUCTS.map(({ id, name, pricePaise }) => ({ id, name, pricePaise }));
  return (
    <main>
      <h1>Razorpay test checkout</h1>
      <p>
        Test mode: no real money moves. Use card 4100 2800 0000 1007 (any future expiry, any CVV,
        any 4 to 10 digit OTP), or UPI ID success@razorpay / failure@razorpay.
      </p>
      <PayButton products={products} />
    </main>
  );
}
