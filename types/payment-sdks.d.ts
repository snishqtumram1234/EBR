// Browser globals added by the payment SDK scripts loaded with next/script.

type CashfreeCheckoutResult = {
  error?: { message?: string };
  redirect?: boolean;
  paymentDetails?: { paymentMessage?: string };
};

type CashfreeInstance = {
  checkout: (options: { paymentSessionId: string; redirectTarget?: string }) => Promise<CashfreeCheckoutResult>;
};

interface Window {
  Cashfree?: (options: { mode: "sandbox" | "production" }) => CashfreeInstance;
}
