import { randomBytes } from "node:crypto";
import { z } from "zod";
import { AppError, errorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { createCashfreeOrder, cashfreeMode } from "@/lib/payments/cashfree";
import { checkoutSchema, quoteCheckout } from "@/lib/payments/demo-checkout";

/**
 * POST /api/payment/cashfree/create-order
 *
 * Body: { items: [{ productId, quantity }], deliveryMethod?, customer?, address? }.
 * Every amount (items, shipping, total) is computed on the server. Returns
 * the Cashfree payment session id for the browser SDK and the server quote.
 *
 * Interim (pre-database) version: order details are kept as tags on the
 * Cashfree order so the receipt page can show them. Once the database is
 * connected, the order lives in Postgres and this takes { orderId }.
 */
export async function POST(request: Request) {
  try {
    const input = checkoutSchema.parse(await request.json().catch(() => null));
    const quote = quoteCheckout(input);

    const orderId = `FS_${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`;
    const origin = new URL(request.url).origin;
    const customer = input.customer ?? { name: "Demo Customer", phone: "9999999999", email: undefined };
    const itemsText = quote.lines.map((l) => `${l.name} x${l.quantity}`).join(", ");

    const order = await createCashfreeOrder({
      orderId,
      amountPaise: quote.totalPaise,
      // Guest checkout: one Cashfree customer per phone number (alphanumeric id).
      customer: { id: `guest${customer.phone}`, phone: customer.phone, name: customer.name, email: customer.email },
      // Used if the popup cannot open (e.g. in-app browsers); the receipt page verifies on arrival.
      returnUrl: `${origin}/checkout/success?order_id={order_id}`,
      note: "Furniture Store order",
      tags: {
        items: itemsText.slice(0, 255),
        subtotal_paise: String(quote.subtotalPaise),
        shipping_paise: String(quote.shippingPaise),
        gst_paise: String(quote.gstIncludedPaise),
        delivery: `${quote.delivery.name} (${quote.delivery.days})`,
        ...(input.address
          ? {
              ship_to: `${input.address.house}, ${input.address.street}`.slice(0, 255),
              city: `${input.address.city}, ${input.address.state} ${input.address.pincode}`.slice(0, 255),
            }
          : {}),
      },
    });

    logger.info("payment.cashfree_order_created", { orderId, cfOrderId: order.cf_order_id, amountPaise: quote.totalPaise });

    return Response.json({
      orderId: order.order_id,
      paymentSessionId: order.payment_session_id,
      mode: cashfreeMode(),
      amount: quote.totalPaise,
      quote,
    });
  } catch (err) {
    if (!(err instanceof AppError) && !(err instanceof z.ZodError)) {
      logger.error("payment.cashfree_create_error", { err });
    }
    return errorResponse(err);
  }
}
