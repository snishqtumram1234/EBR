/**
 * Money is always an integer number of paise. These helpers exist only for
 * display; never feed their output back into calculations.
 */

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function assertPaise(value: number): asserts value is number {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`Expected an integer amount in paise, got ${value}`);
  }
}

/** 4999900 -> "₹49,999". 4999950 -> "₹49,999.50". */
export function formatPaise(paise: number): string {
  assertPaise(paise);
  return inrFormatter.format(paise / 100);
}

/** Whole rupees to paise, for seeds and admin forms that accept rupees. */
export function rupeesToPaise(rupees: number): number {
  const paise = Math.round(rupees * 100);
  assertPaise(paise);
  return paise;
}
