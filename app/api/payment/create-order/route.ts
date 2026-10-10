import { errorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { demoItemsSchema, priceDemoItems } from "@/lib/payments/demo-catalog";
import { createRazorpayOrder, publicKeyId } from "@/lib/payments/razorpay";

/**
 * POST /api/payment/create-order
 *
 * Interim (pre-database) version: the client sends product ids and
 * quantities; the server prices them from its own list. Once the database is
 * connected the body becomes { orderId } and the amount is read from our order.
 */
export async function POST(request: Request) {
  try {
    const body = demoItemsSchema.parse(await request.json().catch(() => null));
    const amountPaise = priceDemoItems(body.items);

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
