/**
 * Store-wide business constants. Values that also exist in SQL functions are
 * noted; keep both in step (tests compare them).
 */

/** GST rate in basis points (1800 = 18%). Listed prices INCLUDE GST. Mirrored in SQL. */
export const GST_RATE_BPS = 1800;

/** Maximum quantity of a single cart line. Mirrored in cart_items check constraint. */
export const MAX_LINE_QUANTITY = 10;

/** Unpaid orders are cancelled and their stock released after this many minutes. */
export const ORDER_EXPIRY_MINUTES = 30;

/** A pending order for the same cart created within this window is reused. */
export const DUPLICATE_ORDER_WINDOW_MINUTES = 10;

/** Razorpay Checkout closes itself after this long, safely before order expiry. */
export const CHECKOUT_TIMEOUT_SECONDS = 25 * 60;

export const CURRENCY = "INR" as const;
