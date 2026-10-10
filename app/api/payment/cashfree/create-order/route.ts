import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { AppError, errorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { ensurePayment, placeOrder } from "@/lib/orders/service";
import { cashfreeMode, createCashfreeOrder, fetchCashfreeOrder } from "@/lib/payments/cashfree";
import { checkoutSchema } from "@/lib/payments/demo-checkout";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/payment/cashfree/create-order   (login required)
 *
 * Body: { items, deliveryMethod, customer, address }. Creates (or reuses) the
 * pending order, so the amount comes from the database, then creates the
 * matching Cashfree order and returns the session id for Cashfree's checkout.
 * Our order number is the Cashfree order id.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    rateLimit(`pay:${user.id}`, 20, 10 * 60 * 1000);
    const input = checkoutSchema.parse(await request.json().catch(() => null));

    const order = await placeOrder(input);
    await ensurePayment({
      orderId: order.orderId,
      userId: user.id,
      provider: "cashfree",
      providerOrderId: order.orderNumber,
      amountPaise: order.totalPaise,
    });

    // Retrying checkout on the same order must reuse the Cashfree order, not create a second one.
    let session: string | null = null;
    if (order.reused) {
      try {
        const existing = await fetchCashfreeOrder(order.orderNumber);
        if (existing.order_status === "ACTIVE") session = existing.payment_session_id;
      } catch {
        // No Cashfree order yet (the first attempt failed): create it below.
      }
    }
    if (!session) {
      // Cashfree needs at least 15 minutes of validity; our hold may have less left on a retry.
      const minimum = Date.now() + 16 * 60 * 1000;
      const cf = await createCashfreeOrder({
        orderId: order.orderNumber,
        amountPaise: order.totalPaise,
        customer: {
          id: `u${user.id.replaceAll("-", "")}`,
          phone: input.customer.phone,
          name: input.customer.name,
          email: user.email ?? input.customer.email,
        },
        returnUrl: `${new URL(request.url).origin}/checkout/success?order_id={order_id}`,
        note: "Aurelle order",
        expiresAt: new Date(Math.max(order.expiresAt?.getTime() ?? 0, minimum)),
      });
      session = cf.payment_session_id;
    }

    logger.info("payment.cashfree_order_ready", { orderNumber: order.orderNumber, amountPaise: order.totalPaise });
    return Response.json({
      orderNumber: order.orderNumber,
      paymentSessionId: session,
      mode: cashfreeMode(),
      amount: order.totalPaise,
    });
  } catch (err) {
    if (!(err instanceof AppError) && !(err instanceof z.ZodError)) {
      logger.error("payment.cashfree_create_error", { err });
    }
    return errorResponse(err);
  }
}
