import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { AppError, errorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { submitUpiReference } from "@/lib/orders/service";
import { UTR_PATTERN } from "@/lib/payments/upi";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/payment/upi/confirm   (login required)
 *
 * Body: { reference, utr }. The customer submits the 12-digit bank reference
 * (UTR) from their UPI app. A direct UPI payment has no gateway callback, so
 * this only records the claim: the order stays "verifying" until the store
 * owner matches the UTR against the bank statement and confirms it. A UTR
 * alone is never treated as proof of payment.
 */
const bodySchema = z.strictObject({
  reference: z.string().regex(/^FS[A-Z0-9]{6,30}$/, "Invalid payment reference"),
  utr: z.string().trim().regex(UTR_PATTERN, "UTR must be the 12-digit number shown in your UPI app"),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    rateLimit(`utr:${user.id}`, 10, 10 * 60 * 1000);
    const body = bodySchema.parse(await request.json().catch(() => null));
    await submitUpiReference(body.reference, user.id, body.utr);
    return Response.json({ status: "pending_verification", reference: body.reference });
  } catch (err) {
    if (!(err instanceof AppError) && !(err instanceof z.ZodError)) {
      logger.error("payment.upi_confirm_error", { err });
    }
    return errorResponse(err);
  }
}
