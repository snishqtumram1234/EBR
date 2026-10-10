import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The route handlers are tested with the database layer replaced: what matters here is
// that they require login, never take money amounts from the browser, and call the
// database functions with the right inputs.
const session = vi.hoisted(() => ({ requireUser: vi.fn() }));
const service = vi.hoisted(() => ({
  placeOrder: vi.fn(),
  ensurePayment: vi.fn(),
  submitUpiReference: vi.fn(),
  syncCashfreePayment: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => session);
vi.mock("@/lib/orders/service", () => service);

// Module resets give each test a fresh copy of the error class, so build errors from the same copy the routes use.
const appError = async (code: "UNAUTHENTICATED" | "OUT_OF_STOCK", message: string) => {
  const { AppError } = await import("@/lib/errors");
  return new AppError(code, message);
};

const post = (url: string, body: unknown) =>
  new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

const valid = {
  items: [{ productId: "linen-cloud-sofa", quantity: 2 }],
  deliveryMethod: "standard",
  customer: { name: "Priya Deshpande", phone: "9876543210" },
  address: { house: "Flat 1", street: "Baner Road", city: "Pune", state: "Maharashtra", pincode: "411045" },
};

const placed = { orderId: "11111111-1111-1111-1111-111111111111", orderNumber: "ORD-10001", totalPaise: 10999800, reused: false, expiresAt: new Date(Date.now() + 30 * 60_000) };

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  session.requireUser.mockResolvedValue({ id: "11111111-aaaa-bbbb-cccc-222222222222", email: "priya@example.com" });
  service.placeOrder.mockResolvedValue(placed);
  service.ensurePayment.mockResolvedValue({ id: "pay-1", providerOrderId: "FSREF000001", status: "pending", created: true });
  vi.stubEnv("UPI_VPA", "demo.store@okhdfcbank");
  vi.stubEnv("UPI_PAYEE_NAME", "Aurelle");
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
  it("requires login", async () => {
    session.requireUser.mockRejectedValue(await appError("UNAUTHENTICATED", "Please log in to continue"));
    const { POST } = await import("@/app/api/payment/upi/create/route");
    const res = await POST(post("http://localhost/x", valid));
    expect(res.status).toBe(401);
    expect(service.placeOrder).not.toHaveBeenCalled();
  });

  it("charges the amount from the database order and returns a UPI link and QR", async () => {
    const { POST } = await import("@/app/api/payment/upi/create/route");
    const res = await POST(post("http://localhost/x", valid));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.orderNumber).toBe("ORD-10001");
    expect(body.amount).toBe(10999800);
    expect(body.upiLink).toMatch(/^upi:\/\/pay\?pa=demo\.store@okhdfcbank&pn=Aurelle&am=109998\.00&cu=INR&tr=FSREF000001&tn=Order\+ORD-10001$/);
    expect(body.qrDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(service.ensurePayment).toHaveBeenCalledWith(expect.objectContaining({ provider: "upi", amountPaise: 10999800 }));
  });

  it("rejects client-supplied amounts and unknown fields before touching the database", async () => {
    const { POST } = await import("@/app/api/payment/upi/create/route");
    const res = await POST(post("http://localhost/x", { ...valid, amount: 1 }));
    expect(res.status).toBe(400);
    expect(service.placeOrder).not.toHaveBeenCalled();
  });

  it("explains how to enable UPI, without holding any stock, when UPI_VPA is not set", async () => {
    vi.stubEnv("UPI_VPA", "");
    const { POST } = await import("@/app/api/payment/upi/create/route");
    const res = await POST(post("http://localhost/x", valid));
    expect(res.status).toBe(500);
    expect((await res.json()).error.message).toMatch(/UPI_VPA/);
    expect(service.placeOrder).not.toHaveBeenCalled();
  });

  it("passes database errors such as out-of-stock through with a safe message", async () => {
    service.placeOrder.mockRejectedValue(await appError("OUT_OF_STOCK", "Only 1 left of Linen Cloud Sofa"));
    const { POST } = await import("@/app/api/payment/upi/create/route");
    const res = await POST(post("http://localhost/x", valid));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toEqual({ code: "OUT_OF_STOCK", message: "Only 1 left of Linen Cloud Sofa" });
  });
});

describe("POST /api/payment/upi/confirm", () => {
  it("records the reference for the signed-in customer only", async () => {
    const { POST } = await import("@/app/api/payment/upi/confirm/route");
    const res = await POST(post("http://localhost/x", { reference: "FSREF000001", utr: "123456789012" }));
    expect(res.status).toBe(200);
    expect(service.submitUpiReference).toHaveBeenCalledWith("FSREF000001", "11111111-aaaa-bbbb-cccc-222222222222", "123456789012");
  });

  it("rejects malformed references and extra fields", async () => {
    const { POST } = await import("@/app/api/payment/upi/confirm/route");
    expect((await POST(post("http://localhost/x", { reference: "FSREF000001", utr: "12345" }))).status).toBe(400);
    expect((await POST(post("http://localhost/x", { reference: "bad ref", utr: "123456789012" }))).status).toBe(400);
    expect((await POST(post("http://localhost/x", { reference: "FSREF000001", utr: "123456789012", userId: "x" }))).status).toBe(400);
    expect(service.submitUpiReference).not.toHaveBeenCalled();
  });
});

describe("Cashfree routes", () => {
  it("creates the Cashfree order from our order number and database amount", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ cf_order_id: "1", order_id: "ORD-10001", order_amount: 109998, order_currency: "INR", order_status: "ACTIVE", payment_session_id: "session_abc" }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("@/app/api/payment/cashfree/create-order/route");
    const res = await POST(post("http://localhost/api/payment/cashfree/create-order", valid));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ orderNumber: "ORD-10001", paymentSessionId: "session_abc", mode: "sandbox", amount: 10999800 });
    expect(JSON.stringify(body)).not.toContain("cfsk_test_secret");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://sandbox.cashfree.com/pg/orders");
    const sent = JSON.parse(String(init.body));
    expect(sent.order_id).toBe("ORD-10001");
    expect(sent.order_amount).toBe(109998);
    expect(sent.customer_details.customer_id).toMatch(/^u[a-f0-9]{32}$/);
    expect(sent.order_meta.return_url).toBe("http://localhost/checkout/success?order_id={order_id}");
    // Cashfree needs at least 15 minutes of validity.
    expect(new Date(sent.order_expiry_time).getTime() - Date.now()).toBeGreaterThan(15 * 60_000);
  });

  it("requires login and does not create a Cashfree order without it", async () => {
    session.requireUser.mockRejectedValue(await appError("UNAUTHENTICATED", "Please log in to continue"));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("@/app/api/payment/cashfree/create-order/route");
    expect((await POST(post("http://localhost/x", valid))).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("verify maps the database result to paid, pending and failed", async () => {
    const { POST } = await import("@/app/api/payment/cashfree/verify/route");
    const call = () => POST(post("http://localhost/x", { orderNumber: "ORD-10001" }));

    service.syncCashfreePayment.mockResolvedValueOnce("paid");
    expect((await call()).status).toBe(200);
    service.syncCashfreePayment.mockResolvedValueOnce("pending");
    expect((await call()).status).toBe(202);
    service.syncCashfreePayment.mockResolvedValueOnce("failed");
    expect((await call()).status).toBe(402);
    expect(service.syncCashfreePayment).toHaveBeenCalledWith("ORD-10001", "11111111-aaaa-bbbb-cccc-222222222222");
  });

  it("verify rejects invalid order numbers", async () => {
    const { POST } = await import("@/app/api/payment/cashfree/verify/route");
    expect((await POST(post("http://localhost/x", { orderNumber: "../../x" }))).status).toBe(400);
    expect(service.syncCashfreePayment).not.toHaveBeenCalled();
  });
});

describe("sanitizeTags", () => {
  it("keeps Cashfree order tags to printable ASCII", async () => {
    const { sanitizeTags } = await import("@/lib/payments/cashfree");
    expect(sanitizeTags({ items: "Test item (₹1) x1", city: "पुणे Pune,  MH" })).toEqual({ items: "Test item (Rs 1) x1", city: "Pune, MH" });
  });
});
