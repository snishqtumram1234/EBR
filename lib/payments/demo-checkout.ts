import { z } from "zod";
import { MAX_LINE_QUANTITY } from "@/lib/config";

/**
 * Body accepted by the checkout routes. The browser sends product ids and
 * quantities plus delivery choices only; prices, shipping, stock and
 * serviceability are decided by the database function create_order.
 */
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
  customer: z.strictObject({
    name: z.string().trim().min(2, "Enter your full name").max(80),
    phone,
    email: z.email("Enter a valid email").max(254).optional().or(z.literal("").transform(() => undefined)),
  }),
  address: z.strictObject({
    house: z.string().trim().min(1, "Enter house / flat").max(120),
    street: z.string().trim().min(1, "Enter street / area").max(120),
    city: z.string().trim().min(2, "Enter city").max(60),
    state: z.string().trim().min(2, "Enter state").max(60),
    pincode: z.string().trim().regex(/^[1-9][0-9]{5}$/, "Enter a 6-digit pincode"),
  }),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
