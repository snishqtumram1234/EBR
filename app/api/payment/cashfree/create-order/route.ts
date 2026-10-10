import { randomBytes } from "node:crypto";
import { z } from "zod";
import { AppError, errorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { createCashfreeOrder, cashfreeMode } from "@/lib/payments/cashfree";
import { demoItemsSchema, priceDemoItems } from "@/lib/payments/demo-catalog";

/**
 * POST /api/payment/cashfree/create-order
 *
 * Body: { items: [{ productId, quantity }] }. Amount is computed on the
 * server. Returns the Cashfree payment session id for the browser SDK.
 *
 * Interim (pre-database) version: the customer is a fixed demo customer.
 * Once auth and the database exist, the order and customer come from there.
 */
export async function POST(request: Request) {
  try {
    const body = demoItemsSchema.parse(await request.json().catch(() => null));
    const amountPaise = priceDemoItems(body.items);

    const orderId = `FS_${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`;
    const origin = new URL(request.url).origin;

    const order = await createCashfreeOrder({
      orderId,
      amountPaise,
      customer: { id: "demo_customer", phone: "9999999999", name: "Demo Customer" },
      // Used only if the popup cannot open (e.g. in-app browsers); the page verifies on return.
      returnUrl: `${origin}/pay-demo?cf_order_id={order_id}`,
      note: "Furniture Store demo order",
    });

    logger.info("payment.cashfree_order_created", { orderId, cfOrderId: order.cf_order_id, amountPaise });

    return Response.json({
      orderId: order.order_id,
      paymentSessionId: order.payment_session_id,
      mode: cashfreeMode(),
      amount: amountPaise,
    });
  } catch (err) {
    if (!(err instanceof AppError) && !(err instanceof z.ZodError)) {
      logger.error("payment.cashfree_create_error", { err });
    }
    return errorResponse(err);
  }
}
