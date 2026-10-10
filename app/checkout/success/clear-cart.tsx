"use client";

import { useEffect } from "react";
import { useStore } from "@/components/store/store-provider";

/** Rendered only after the server has confirmed payment with Cashfree. */
export function ClearCartOnPaid() {
  const { clearCart } = useStore();
  useEffect(() => {
    clearCart();
    // Run once per confirmed order view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
