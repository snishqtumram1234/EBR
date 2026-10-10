import QRCode from "qrcode";
import { upiEnv } from "@/lib/env";
import { z } from "zod";
import { AppError, errorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { demoItemsSchema, priceDemoItems } from "@/lib/payments/demo-catalog";
import { buildUpiLink, newUpiReference } from "@/lib/payments/upi";

/**
 * POST /api/payment/upi/create
 *
 * Body: { items: [{ productId, quantity }] }. The amount is computed on the
 * server. Returns a UPI deep link and the same link as a QR code image.
 */
export async function POST(request: Request) {
  try {
    const body = demoItemsSchema.parse(await request.json().catch(() => null));
    const amountPaise = priceDemoItems(body.items);
    const { UPI_VPA, UPI_PAYEE_NAME } = upiEnv();

    const reference = newUpiReference();
    const upiLink = buildUpiLink({
      vpa: UPI_VPA,
      payeeName: UPI_PAYEE_NAME,
      amountPaise,
      reference,
      note: `Order ${reference}`,
    });
    const qrDataUrl = await QRCode.toDataURL(upiLink, { width: 280, margin: 2, errorCorrectionLevel: "M" });

    logger.info("payment.upi_requested", { reference, amountPaise });

    return Response.json({
      reference,
      amount: amountPaise,
      currency: "INR",
      payeeName: UPI_PAYEE_NAME,
      upiId: UPI_VPA,
      upiLink,
      qrDataUrl,
    });
  } catch (err) {
    if (!(err instanceof AppError) && !(err instanceof z.ZodError)) {
      // e.g. UPI_VPA missing from .env.local: the log names the variable, the customer sees a generic error.
      logger.error("payment.upi_create_error", { err });
    }
    return errorResponse(err);
  }
}
