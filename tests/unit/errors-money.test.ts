import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AppError, toAppError } from "@/lib/errors";
import { formatPaise, rupeesToPaise } from "@/lib/money";

describe("toAppError", () => {
  it("maps business errors raised in SQL by their hint", () => {
    const e = toAppError({ code: "P0001", message: "Only 1 left of Oslo Sofa", hint: "OUT_OF_STOCK" });
    expect(e).toBeInstanceOf(AppError);
    expect(e.code).toBe("OUT_OF_STOCK");
    expect(e.status).toBe(409);
    expect(e.message).toBe("Only 1 left of Oslo Sofa");
  });

  it("never leaks raw database messages for unknown errors", () => {
    const e = toAppError({ code: "XX000", message: 'relation "secret_table" does not exist' });
    expect(e.code).toBe("INTERNAL_ERROR");
    expect(e.message).not.toMatch(/secret_table/);
    expect(toAppError(new Error("stack trace here")).message).not.toMatch(/stack/);
  });

  it("maps permission and constraint errors to safe messages", () => {
    expect(toAppError({ code: "42501", message: "permission denied for table orders" }).code).toBe("FORBIDDEN");
    expect(toAppError({ code: "23505", message: "duplicate key" }).code).toBe("CONFLICT");
  });

  it("turns zod errors into VALIDATION_ERROR with the field path", () => {
    const r = z.object({ qty: z.number().int().min(1) }).safeParse({ qty: 0 });
    const e = toAppError(r.error);
    expect(e.code).toBe("VALIDATION_ERROR");
    expect(e.message).toMatch(/^qty: /);
    expect(e.toBody()).toEqual({ error: { code: "VALIDATION_ERROR", message: e.message } });
  });
});

describe("money", () => {
  it("formats paise as rupees in Indian grouping", () => {
    expect(formatPaise(4999900)).toBe("₹49,999");
    expect(formatPaise(12345678)).toBe("₹1,23,456.78");
    expect(formatPaise(0)).toBe("₹0");
  });

  it("rejects non-integer paise", () => {
    expect(() => formatPaise(10.5)).toThrow(TypeError);
  });

  it("converts rupees to paise without float drift", () => {
    expect(rupeesToPaise(19.99)).toBe(1999);
    expect(rupeesToPaise(0.1 + 0.2)).toBe(30);
  });
});
