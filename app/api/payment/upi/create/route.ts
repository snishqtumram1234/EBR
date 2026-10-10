import QRCode from "qrcode";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { upiEnv } from "@/lib/env";
import { AppError, errorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { ensurePayment, placeOrder } from "@/lib/orders/service";
import { checkoutSchema } from "@/lib/payments/demo-checkout";
import { buildUpiLink, newUpiReference } from "@/lib/payments/upi";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/payment/upi/create   (login required)
 *
 * Body: { items, deliveryMethod, customer, address }. Creates (or reuses) the
 * pending order, so stock is held and the amount comes from the database,
 * then returns a UPI link and QR code for the store's own UPI ID.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    rateLimit(`pay:${user.id}`, 20, 10 * 60 * 1000);
    const input = checkoutSchema.parse(await request.json().catch(() => null));

    // Check configuration before holding any stock.
    let vpa: string;
    let payeeName: string;
    try {
      ({ UPI_VPA: vpa, UPI_PAYEE_NAME: payeeName } = upiEnv());
    } catch {
      throw new AppError("INTERNAL_ERROR", "UPI QR payments aren't set up yet. Add UPI_VPA to .env.local and restart the server.");
    }

    const order = await placeOrder(input);
    const payment = await ensurePayment({
      orderId: order.orderId,
      userId: user.id,
      provider: "upi",
      providerOrderId: newUpiReference(),
      amountPaise: order.totalPaise,
    });

    const upiLink = buildUpiLink({
      vpa,
      payeeName,
      amountPaise: order.totalPaise,
      reference: payment.providerOrderId,
      note: `Order ${order.orderNumber}`,
    });
    const qrDataUrl = await QRCode.toDataURL(upiLink, { width: 280, margin: 2, errorCorrectionLevel: "M" });

    logger.info("payment.upi_requested", { orderNumber: order.orderNumber, reference: payment.providerOrderId, amountPaise: order.totalPaise });

    return Response.json({
      orderNumber: order.orderNumber,
      reference: payment.providerOrderId,
      amount: order.totalPaise,
      currency: "INR",
      payeeName,
      upiId: vpa,
      upiLink,
      qrDataUrl,
    });
  } catch (err) {
    if (!(err instanceof AppError) && !(err instanceof z.ZodError)) {
      logger.error("payment.upi_create_error", { err });
    }
    return errorResponse(err);
  }
}
