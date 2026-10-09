import { z } from "zod";
import { AppError, errorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { MAX_LINE_QUANTITY } from "@/lib/config";
import { findDemoProduct } from "@/lib/payments/demo-catalog";
import { createRazorpayOrder, publicKeyId } from "@/lib/payments/razorpay";

/**
 * POST /api/payment/create-order
 *
 * Interim (pre-database) version: the client sends product ids and
 * quantities; the server prices them from its own list. Once the database is
 * connected the body becomes { orderId } and the amount is read from our order.
 */
const bodySchema = z.strictObject({
  items: z
    .array(
      z.strictObject({
        productId: z.string().min(1).max(100),
        quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
      }),
    )
    .min(1)
    .max(20),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json().catch(() => null));

    let amountPaise = 0;
    for (const item of body.items) {
      const product = findDemoProduct(item.productId);
      if (!product) throw new AppError("NOT_FOUND", `Unknown product: ${item.productId}`);
      amountPaise += product.pricePaise * item.quantity;
    }

    const receipt = `demo_${Date.now()}`;
    const order = await createRazorpayOrder({ amountPaise, receipt });

    logger.info("payment.order_created", {
      razorpayOrderId: order.id,
      receipt,
      amountPaise: order.amount,
    });

    return Response.json({
      razorpayOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: publicKeyId(),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
