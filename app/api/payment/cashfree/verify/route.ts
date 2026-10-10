import { z } from "zod";
import { AppError, errorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { verifyCashfreeOrder } from "@/lib/payments/cashfree";

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
    const result = await verifyCashfreeOrder(orderId);

    if (result.status === "paid") {
      return Response.json({ status: "paid", amount: result.amountPaise, method: result.method });
    }
    if (result.status === "pending") {
      return Response.json({ status: "pending" }, { status: 202 });
    }
    return Response.json({ error: { code: "PAYMENT_FAILED", message: result.message } }, { status: 402 });
  } catch (err) {
    if (!(err instanceof AppError) && !(err instanceof z.ZodError)) {
      logger.error("payment.cashfree_verify_error", { orderId, err });
    }
    return errorResponse(err);
  }
}
