import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const post = (url: string, body: unknown) =>
  new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("UPI_VPA", "demo.store@okaxis");
  vi.stubEnv("UPI_PAYEE_NAME", "Furniture Store");
  vi.stubEnv("CASHFREE_APP_ID", "TEST_APP_ID");
  vi.stubEnv("CASHFREE_SECRET_KEY", "cfsk_test_secret");
  vi.stubEnv("CASHFREE_ENV", "sandbox");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /api/payment/upi/create", () => {
  it("prices on the server and returns a UPI link and QR", async () => {
    const { POST } = await import("@/app/api/payment/upi/create/route");
    const res = await POST(post("http://localhost/api/payment/upi/create", { items: [{ productId: "test-item-one-rupee", quantity: 3 }] }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.amount).toBe(300);
    expect(body.upiLink).toMatch(/^upi:\/\/pay\?pa=demo\.store@okaxis&pn=Furniture\+Store&am=3\.00&cu=INR&tr=FS/);
    expect(body.qrDataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it("rejects client-supplied amounts", async () => {
    const { POST } = await import("@/app/api/payment/upi/create/route");
    const res = await POST(post("http://localhost/x", { items: [{ productId: "test-item-one-rupee", quantity: 1 }], amount: 1 }));
    expect(res.status).toBe(400);
  });
});

describe("Cashfree routes", () => {
  it("creates an order in rupees from server prices and returns only the session id", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ cf_order_id: "123", order_id: "FS_x_aaaaaa", order_amount: 449.99, order_currency: "INR", order_status: "ACTIVE", payment_session_id: "session_abc" }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("@/app/api/payment/cashfree/create-order/route");
    const res = await POST(post("http://localhost/api/payment/cashfree/create-order", { items: [{ productId: "terracotta-lamp-and-vase-set", quantity: 2 }] }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ paymentSessionId: "session_abc", mode: "sandbox", amount: 999800 });
    expect(JSON.stringify(body)).not.toContain("cfsk_test_secret");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://sandbox.cashfree.com/pg/orders");
    const sent = JSON.parse(String(init.body));
    expect(sent.order_amount).toBe(9998);
    expect(sent.order_currency).toBe("INR");
    expect(sent.order_meta.return_url).toBe("http://localhost/checkout/success?order_id={order_id}");
    expect(sent.customer_details.customer_id).toMatch(/^[A-Za-z0-9]+$/);
  });

  it("verify reports paid only when Cashfree says PAID with a matching successful payment", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.endsWith("/payments")
          ? Response.json([{ cf_payment_id: 9, order_id: "FS_abc_123456", payment_status: "SUCCESS", payment_amount: 1, payment_currency: "INR", payment_group: "upi", payment_message: null }])
          : Response.json({ cf_order_id: "1", order_id: "FS_abc_123456", order_amount: 1, order_currency: "INR", order_status: "PAID", payment_session_id: "s" }),
      ),
    );
    const { POST } = await import("@/app/api/payment/cashfree/verify/route");
    const res = await POST(post("http://localhost/x", { orderId: "FS_abc_123456" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "paid", amount: 100, method: "upi" });
  });

  it("verify rejects a paid amount that differs from the order amount", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.endsWith("/payments")
          ? Response.json([{ cf_payment_id: 9, order_id: "FS_abc_123456", payment_status: "SUCCESS", payment_amount: 0.5, payment_currency: "INR", payment_group: "upi", payment_message: null }])
          : Response.json({ cf_order_id: "1", order_id: "FS_abc_123456", order_amount: 1, order_currency: "INR", order_status: "PAID", payment_session_id: "s" }),
      ),
    );
    const { POST } = await import("@/app/api/payment/cashfree/verify/route");
    const res = await POST(post("http://localhost/x", { orderId: "FS_abc_123456" }));
    expect(res.status).toBe(402);
  });

  it("verify reports failure when the customer's payment failed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.endsWith("/payments")
          ? Response.json([{ cf_payment_id: 9, order_id: "FS_abc_123456", payment_status: "FAILED", payment_amount: 1, payment_currency: "INR", payment_group: "upi", payment_message: "Payment declined" }])
          : Response.json({ cf_order_id: "1", order_id: "FS_abc_123456", order_amount: 1, order_currency: "INR", order_status: "ACTIVE", payment_session_id: "s" }),
      ),
    );
    const { POST } = await import("@/app/api/payment/cashfree/verify/route");
    const res = await POST(post("http://localhost/x", { orderId: "FS_abc_123456" }));
    expect(res.status).toBe(402);
    expect((await res.json()).error.message).toBe("Payment declined");
  });
});

describe("sanitizeTags", () => {
  it("keeps Cashfree order tags to printable ASCII", async () => {
    const { sanitizeTags } = await import("@/lib/payments/cashfree");
    expect(sanitizeTags({ items: "Test item (₹1) x1", city: "पुणे Pune,  MH" })).toEqual({ items: "Test item (Rs 1) x1", city: "Pune, MH" });
  });
});
