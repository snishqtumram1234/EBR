import { z } from "zod";
import { errorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { UTR_PATTERN } from "@/lib/payments/upi";

/**
 * POST /api/payment/upi/confirm
 *
 * Body: { reference, utr }. The customer submits the 12-digit UTR from their
 * UPI app. Direct UPI has no gateway callback, so this records the claim and
 * returns "pending_verification": the store owner matches the UTR against
 * their bank statement before marking the order paid. A UTR alone is never
 * treated as proof of payment.
 */
const bodySchema = z.strictObject({
  reference: z.string().regex(/^FS[A-Z0-9]{6,30}$/, "Invalid payment reference"),
  utr: z.string().trim().regex(UTR_PATTERN, "UTR must be the 12-digit number shown in your UPI app"),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json().catch(() => null));
    logger.info("payment.upi_utr_submitted", { reference: body.reference, utr: body.utr });
    return Response.json({ status: "pending_verification", reference: body.reference });
  } catch (err) {
    return errorResponse(err);
  }
}
