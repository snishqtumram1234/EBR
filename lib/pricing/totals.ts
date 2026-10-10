/**
 * Pure order-total calculation, shared by the server (authoritative) and the
 * browser (display only). All amounts are integer paise.
 *
 * Listed prices INCLUDE GST, so GST is reported as the component already
 * inside the total, not added on top.
 */

export type TotalsLine = { unitPricePaise: number; quantity: number };

export type Totals = {
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  totalPaise: number;
  /** GST already included in totalPaise. */
  gstIncludedPaise: number;
};

function assertPaise(n: number, what: string) {
  if (!Number.isSafeInteger(n) || n < 0) throw new RangeError(`${what} must be a non-negative integer (paise)`);
}

export function computeTotals(input: {
  lines: TotalsLine[];
  shippingPaise: number;
  discountPaise?: number;
  gstRateBps: number;
}): Totals {
  const { lines, shippingPaise, gstRateBps } = input;
  const requestedDiscount = input.discountPaise ?? 0;
  assertPaise(shippingPaise, "shipping");
  assertPaise(requestedDiscount, "discount");
  assertPaise(gstRateBps, "GST rate");

  let subtotalPaise = 0;
  for (const line of lines) {
    assertPaise(line.unitPricePaise, "unit price");
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1) throw new RangeError("quantity must be >= 1");
    subtotalPaise += line.unitPricePaise * line.quantity;
  }

  // A discount can never exceed the goods value, so the total can never go negative.
  const discountPaise = Math.min(requestedDiscount, subtotalPaise);
  const totalPaise = subtotalPaise - discountPaise + shippingPaise;
  const gstIncludedPaise = Math.round((totalPaise * gstRateBps) / (10000 + gstRateBps));

  return { subtotalPaise, discountPaise, shippingPaise, totalPaise, gstIncludedPaise };
}
