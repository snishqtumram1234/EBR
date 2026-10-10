import QRCode from "qrcode";
import { z } from "zod";
import { upiEnv } from "@/lib/env";
import { AppError, errorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { checkoutSchema, quoteCheckout } from "@/lib/payments/demo-checkout";
import { buildUpiLink, newUpiReference } from "@/lib/payments/upi";

/**
 * POST /api/payment/upi/create
 *
 * Body: same as the Cashfree route: { items, deliveryMethod?, customer?, address? }.
 * The amount (items + delivery) is computed on the server. Returns a UPI deep
 * link and the same link as a QR code image for the store's own UPI ID.
 */
export async function POST(request: Request) {
  try {
    const input = checkoutSchema.parse(await request.json().catch(() => null));
    const quote = quoteCheckout(input);

    let vpa: string;
    let payeeName: string;
    try {
      ({ UPI_VPA: vpa, UPI_PAYEE_NAME: payeeName } = upiEnv());
    } catch {
      throw new AppError("INTERNAL_ERROR", "UPI QR payments aren't set up yet. Add UPI_VPA to .env.local and restart the server.");
    }

    const reference = newUpiReference();
    const upiLink = buildUpiLink({
      vpa,
      payeeName,
      amountPaise: quote.totalPaise,
      reference,
      note: `Order ${reference}`,
    });
    const qrDataUrl = await QRCode.toDataURL(upiLink, { width: 280, margin: 2, errorCorrectionLevel: "M" });

    logger.info("payment.upi_requested", { reference, amountPaise: quote.totalPaise });

    return Response.json({
      reference,
      amount: quote.totalPaise,
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
