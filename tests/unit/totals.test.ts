import { describe, expect, it } from "vitest";
import { computeTotals } from "@/lib/pricing/totals";

describe("computeTotals", () => {
  it("adds lines and shipping and reports the GST already included", () => {
    const t = computeTotals({
      lines: [{ unitPricePaise: 4499900, quantity: 1 }, { unitPricePaise: 249900, quantity: 2 }],
      shippingPaise: 49900,
      gstRateBps: 1800,
    });
    expect(t.subtotalPaise).toBe(4999700);
    expect(t.totalPaise).toBe(5049600);
    // 18% inclusive: 5049600 * 18 / 118 = 770277.966 -> 770278
    expect(t.gstIncludedPaise).toBe(770278);
  });

  it("caps the discount at the subtotal so the total never goes negative", () => {
    const t = computeTotals({ lines: [{ unitPricePaise: 100, quantity: 1 }], shippingPaise: 0, discountPaise: 500, gstRateBps: 1800 });
    expect(t.discountPaise).toBe(100);
    expect(t.totalPaise).toBe(0);
  });

  it("rounds GST to whole paise", () => {
    expect(computeTotals({ lines: [{ unitPricePaise: 100, quantity: 1 }], shippingPaise: 0, gstRateBps: 1800 }).gstIncludedPaise).toBe(15);
  });

  it("rejects floats and negative amounts", () => {
    expect(() => computeTotals({ lines: [{ unitPricePaise: 10.5, quantity: 1 }], shippingPaise: 0, gstRateBps: 1800 })).toThrow();
    expect(() => computeTotals({ lines: [{ unitPricePaise: 100, quantity: 0 }], shippingPaise: 0, gstRateBps: 1800 })).toThrow();
    expect(() => computeTotals({ lines: [], shippingPaise: -1, gstRateBps: 1800 })).toThrow();
  });
});
