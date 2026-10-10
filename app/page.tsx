import Link from "next/link";

// Placeholder home page. The designed UI replaces this; it must only call lib/.
export default function Home() {
  return (
    <main>
      <h1>Furniture Store</h1>
      <p>Backend foundation is in place. Storefront pages arrive in later phases.</p>
      <ul>
        <li>
          <Link href="/checkout">Checkout (Cashfree, test mode)</Link>
        </li>
        <li>
          <Link href="/pay-demo">Payment methods demo (Cashfree, Razorpay, direct UPI QR)</Link>
        </li>
      </ul>
    </main>
  );
}
