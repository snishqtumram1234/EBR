import { z } from "zod";
import { AppError, errorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
  fetchRazorpayOrder,
  fetchRazorpayPayment,
  keySecret,
} from "@/lib/payments/razorpay";
import { verifyCheckoutSignature } from "@/lib/payments/signature";

/**
 * POST /api/payment/verify
 *
 * Called by the browser after Razorpay Checkout succeeds. Never trusts the
 * browser: checks the HMAC signature, then asks Razorpay directly for the
 * payment and order and confirms they match.
 *
 * Interim (pre-database) version: the expected amount is the amount on the
 * Razorpay order our server created. Once the database is connected this also
 * checks the payment row belongs to the caller and calls mark_order_paid.
 */
const bodySchema = z.strictObject({
  razorpay_order_id: z.string().regex(/^order_[A-Za-z0-9]+$/),
  razorpay_payment_id: z.string().regex(/^pay_[A-Za-z0-9]+$/),
  razorpay_signature: z.string().regex(/^[0-9a-f]{64}$/),
});

export async function POST(request: Request) {
  let ids: { razorpayOrderId?: string; razorpayPaymentId?: string } = {};
  try {
    const body = bodySchema.parse(await request.json().catch(() => null));
    ids = { razorpayOrderId: body.razorpay_order_id, razorpayPaymentId: body.razorpay_payment_id };

    const signatureOk = verifyCheckoutSignature({
      orderId: body.razorpay_order_id,
      paymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature,
      keySecret: keySecret(),
    });
    if (!signatureOk) {
      logger.warn("payment.verify_signature_invalid", ids);
      throw new AppError("SIGNATURE_INVALID", "Payment could not be verified");
    }

    const [order, payment] = await Promise.all([
      fetchRazorpayOrder(body.razorpay_order_id),
      fetchRazorpayPayment(body.razorpay_payment_id),
    ]);

    if (payment.order_id !== order.id) {
      logger.warn("payment.verify_order_mismatch", { ...ids, paymentOrderId: payment.order_id });
      throw new AppError("SIGNATURE_INVALID", "Payment does not belong to this order");
    }
    if (payment.amount !== order.amount || payment.currency !== "INR") {
      logger.warn("payment.verify_amount_mismatch", {
        ...ids,
        expectedPaise: order.amount,
        paidPaise: payment.amount,
        currency: payment.currency,
      });
      throw new AppError("PAYMENT_FAILED", "Payment amount does not match the order");
    }

    if (payment.status === "captured") {
      logger.info("payment.verified", { ...ids, amountPaise: payment.amount, method: payment.method });
      return Response.json({ status: "paid", amount: payment.amount, method: payment.method });
    }
    if (payment.status === "authorized") {
      // Auto-capture normally follows within seconds; the payment.captured
      // webhook confirms it. Tell the client to show "processing".
      logger.info("payment.authorized_pending_capture", ids);
      return Response.json({ status: "processing" }, { status: 202 });
    }

    logger.warn("payment.verify_not_successful", { ...ids, status: payment.status, reason: payment.error_reason });
    throw new AppError("PAYMENT_FAILED", payment.error_description ?? "Payment was not successful");
  } catch (err) {
    if (!(err instanceof AppError) && !(err instanceof z.ZodError)) {
      logger.error("payment.verify_error", { ...ids, err });
    }
    return errorResponse(err);
  }
}
