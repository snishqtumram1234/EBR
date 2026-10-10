import "server-only";
import { z } from "zod";
import { GST_RATE_BPS, MAX_LINE_QUANTITY } from "@/lib/config";
import { AppError } from "@/lib/errors";
import { computeTotals, type Totals } from "@/lib/pricing/totals";
import { findDemoProduct } from "./demo-catalog";
import { DEMO_DELIVERY, expressAvailable, type DeliveryMethod } from "@/lib/pricing/delivery";

/**
 * TEMPORARY checkout rules used until the database is connected: delivery
 * methods and serviceability mirror the seed data (Standard free, Express
 * ₹499 for Pune city pincodes). The browser sends ids and choices only;
 * everything with a price is decided here.
 */

export { DEMO_DELIVERY, expressAvailable, type DeliveryMethod } from "@/lib/pricing/delivery";

const phone = z.string().trim().regex(/^[6-9][0-9]{9}$/, "Enter a 10-digit Indian mobile number");

export const checkoutSchema = z.strictObject({
  items: z
    .array(
      z.strictObject({
        productId: z.string().min(1).max(100),
        quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
      }),
    )
    .min(1)
    .max(20),
  deliveryMethod: z.enum(["standard", "express"]).default("standard"),
  customer: z
    .strictObject({
      name: z.string().trim().min(2, "Enter your full name").max(80),
      phone,
      email: z.email("Enter a valid email").max(254).optional().or(z.literal("").transform(() => undefined)),
    })
    .optional(),
  address: z
    .strictObject({
      house: z.string().trim().min(1, "Enter house / flat").max(120),
      street: z.string().trim().min(1, "Enter street / area").max(120),
      city: z.string().trim().min(2, "Enter city").max(60),
      state: z.string().trim().min(2, "Enter state").max(60),
      pincode: z.string().trim().regex(/^[1-9][0-9]{5}$/, "Enter a 6-digit pincode"),
    })
    .optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export type CheckoutQuote = Totals & {
  lines: { productId: string; name: string; quantity: number; unitPricePaise: number }[];
  delivery: { method: DeliveryMethod; name: string; days: string };
};

export function quoteCheckout(input: CheckoutInput): CheckoutQuote {
  const lines = input.items.map((item) => {
    const product = findDemoProduct(item.productId);
    if (!product) throw new AppError("NOT_FOUND", `Unknown product: ${item.productId}`);
    return { productId: product.id, name: product.name, quantity: item.quantity, unitPricePaise: product.pricePaise };
  });

  const method = input.deliveryMethod;
  if (method === "express" && input.address && !expressAvailable(input.address.pincode)) {
    throw new AppError("NOT_SERVICEABLE", "Express delivery isn't available for this pincode. Choose Standard.");
  }
  const delivery = DEMO_DELIVERY[method];

  const totals = computeTotals({ lines, shippingPaise: delivery.pricePaise, gstRateBps: GST_RATE_BPS });
  return { ...totals, lines, delivery: { method, name: delivery.name, days: delivery.days } };
}
