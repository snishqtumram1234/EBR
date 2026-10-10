import { describe, expect, it } from "vitest";
import { UTR_PATTERN, buildUpiLink, newUpiReference, paiseToUpiAmount } from "@/lib/payments/upi";

describe("UPI links", () => {
  it("formats paise as a two-decimal rupee amount", () => {
    expect(paiseToUpiAmount(100)).toBe("1.00");
    expect(paiseToUpiAmount(4499900)).toBe("44999.00");
    expect(paiseToUpiAmount(4505)).toBe("45.05");
    expect(() => paiseToUpiAmount(0)).toThrow();
    expect(() => paiseToUpiAmount(10.5)).toThrow();
  });

  it("builds a upi://pay link with payee, amount, currency and reference", () => {
    const link = buildUpiLink({
      vpa: "store@okaxis",
      payeeName: "Furniture Store",
      amountPaise: 100,
      reference: "FSABC123",
      note: "Order FSABC123",
    });
    expect(link).toBe("upi://pay?pa=store@okaxis&pn=Furniture+Store&am=1.00&cu=INR&tr=FSABC123&tn=Order+FSABC123");
  });

  it("rejects an invalid UPI ID and escapes text fields", () => {
    expect(() =>
      buildUpiLink({ vpa: "not a vpa", payeeName: "x", amountPaise: 100, reference: "r", note: "n" }),
    ).toThrow();
    const link = buildUpiLink({ vpa: "a.b@ybl", payeeName: "A&B", amountPaise: 100, reference: "r", note: "x&am=1" });
    expect(link).toContain("pn=A%26B");
    expect(link).toContain("tn=x%26am%3D1");
    expect(link.match(/&am=/g)).toHaveLength(1);
  });

  it("creates unique references that fit UPI's limit", () => {
    const refs = new Set(Array.from({ length: 50 }, newUpiReference));
    expect(refs.size).toBe(50);
    for (const r of refs) expect(r).toMatch(/^FS[A-Z0-9]{6,30}$/);
  });

  it("accepts only 12-digit UTRs", () => {
    expect(UTR_PATTERN.test("123456789012")).toBe(true);
    expect(UTR_PATTERN.test("12345678901")).toBe(false);
    expect(UTR_PATTERN.test("12345678901a")).toBe(false);
  });
});
