import { z } from "zod";
import { AppError, errorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { fetchCashfreeOrder, fetchCashfreePayments, rupeesToPaise } from "@/lib/payments/cashfree";

/**
 * POST /api/payment/cashfree/verify
 *
 * Body: { orderId }. Never trusts the browser's "success": asks Cashfree for
 * the order and its payments, and reports paid only if the order is PAID and
 * a successful payment covers the full order amount.
 */
const bodySchema = z.strictObject({
  orderId: z.string().regex(/^FS_[a-z0-9]+_[a-f0-9]{6}$/, "Invalid order id"),
});

export async function POST(request: Request) {
  let orderId: string | undefined;
  try {
    ({ orderId } = bodySchema.parse(await request.json().catch(() => null)));

    const [order, payments] = await Promise.all([fetchCashfreeOrder(orderId), fetchCashfreePayments(orderId)]);
    const orderPaise = rupeesToPaise(order.order_amount);
    const success = payments.find((p) => p.payment_status === "SUCCESS");

    if (order.order_status === "PAID" && success) {
      const paidPaise = rupeesToPaise(success.payment_amount);
      if (paidPaise !== orderPaise || success.payment_currency !== "INR") {
        logger.warn("payment.cashfree_amount_mismatch", { orderId, orderPaise, paidPaise });
        throw new AppError("PAYMENT_FAILED", "Payment amount does not match the order");
      }
      logger.info("payment.cashfree_verified", {
        orderId,
        cfPaymentId: String(success.cf_payment_id),
        amountPaise: paidPaise,
        method: success.payment_group,
      });
      return Response.json({ status: "paid", amount: paidPaise, method: success.payment_group });
    }

    const latest = payments[0];
    if (order.order_status === "ACTIVE" && (!latest || latest.payment_status === "PENDING")) {
      return Response.json({ status: "pending" }, { status: 202 });
    }

    logger.info("payment.cashfree_not_paid", { orderId, orderStatus: order.order_status, paymentStatus: latest?.payment_status });
    return Response.json(
      {
        error: {
          code: "PAYMENT_FAILED",
          message: latest?.payment_message || "Payment was not completed. You can try again.",
        },
      },
      { status: 402 },
    );
  } catch (err) {
    if (!(err instanceof AppError) && !(err instanceof z.ZodError)) {
      logger.error("payment.cashfree_verify_error", { orderId, err });
    }
    return errorResponse(err);
  }
}
