import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { AppError, errorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { syncCashfreePayment } from "@/lib/orders/service";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/payment/cashfree/verify   (login required)
 *
 * Body: { orderNumber }. Never trusts the browser's "success": asks Cashfree
 * for the order and its payments, checks the amount against our database and
 * only then marks the order paid (mark_order_paid, idempotent).
 */
const bodySchema = z.strictObject({
  orderNumber: z.string().regex(/^ORD-[0-9]{3,12}$/, "Invalid order number"),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    rateLimit(`verify:${user.id}`, 30, 10 * 60 * 1000);
    const { orderNumber } = bodySchema.parse(await request.json().catch(() => null));
    const result = await syncCashfreePayment(orderNumber, user.id);
    if (result === "paid" || result === "needs_review") return Response.json({ status: "paid" });
    if (result === "pending") return Response.json({ status: "pending" }, { status: 202 });
    return Response.json({ error: { code: "PAYMENT_FAILED", message: "Payment was not completed. You can try again." } }, { status: 402 });
  } catch (err) {
    if (!(err instanceof AppError) && !(err instanceof z.ZodError)) {
      logger.error("payment.cashfree_verify_error", { err });
    }
    return errorResponse(err);
  }
}
