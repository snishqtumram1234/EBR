"use client";

import { useEffect } from "react";
import { useStore } from "@/components/store/store-provider";

/** Empties the guest bag once an order has really been placed and paid or submitted. */
export function ClearCartWhenPlaced() {
  const { clearCart } = useStore();
  useEffect(() => {
    clearCart();
    // Once per visit to a freshly placed order.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
