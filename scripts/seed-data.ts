/**
 * Reference data for seeding: serviceable pincodes (Pune first), delivery
 * methods and coupons. The product catalogue comes from lib/catalog/products.ts
 * so the database always matches what the storefront shows.
 */

/** Pune is the priority market; other metros are sampled. */
export const PINCODES: Array<{
  pincode: string;
  city: string;
  state: string;
  standard_days: number;
  express_available: boolean;
  express_days: number | null;
}> = [
  // Pune city and PCMC: 411001 - 411062
  ...Array.from({ length: 62 }, (_, i) => ({
    pincode: String(411001 + i),
    city: "Pune",
    state: "Maharashtra",
    standard_days: 5,
    express_available: true,
    express_days: 2,
  })),
  // Pune district outskirts: standard only
  ...["412101", "412105", "412106", "412115", "412207", "412208", "412308", "410501", "410506", "410507"].map(
    (pincode) => ({
      pincode,
      city: "Pune District",
      state: "Maharashtra",
      standard_days: 7,
      express_available: false,
      express_days: null,
    }),
  ),
  ...["400001", "400050", "400053", "400058", "400076", "400097", "400101", "400703", "421301"].map((pincode) => ({
    pincode,
    city: pincode.startsWith("4007") || pincode.startsWith("4213") ? "Thane / Navi Mumbai" : "Mumbai",
    state: "Maharashtra",
    standard_days: 5,
    express_available: false,
    express_days: null,
  })),
  ...["560001", "560034", "560038", "560066", "560076", "560102"].map((pincode) => ({
    pincode, city: "Bengaluru", state: "Karnataka", standard_days: 7, express_available: false, express_days: null,
  })),
  ...["110001", "110016", "110017", "110024", "110048", "122002", "201301"].map((pincode) => ({
    pincode,
    city: pincode.startsWith("122") ? "Gurugram" : pincode.startsWith("201") ? "Noida" : "New Delhi",
    state: pincode.startsWith("122") ? "Haryana" : pincode.startsWith("201") ? "Uttar Pradesh" : "Delhi",
    standard_days: 7,
    express_available: false,
    express_days: null,
  })),
  ...["500001", "500032", "500081", "500084"].map((pincode) => ({
    pincode, city: "Hyderabad", state: "Telangana", standard_days: 7, express_available: false, express_days: null,
  })),
  ...["600001", "600017", "600040", "600096"].map((pincode) => ({
    pincode, city: "Chennai", state: "Tamil Nadu", standard_days: 7, express_available: false, express_days: null,
  })),
];

export const DELIVERY_METHODS = [
  { code: "standard", name: "Standard Delivery", description: "Free delivery in 5 to 7 days", price_paise: 0, min_days: 5, max_days: 7, is_express: false, sort_order: 1 },
  { code: "express", name: "Express Delivery", description: "Delivered in 2 to 3 days", price_paise: 49900, min_days: 2, max_days: 3, is_express: true, sort_order: 2 },
];

const day = 24 * 60 * 60 * 1000;

export function seedCoupons(now = new Date()) {
  const iso = (offsetDays: number) => new Date(now.getTime() + offsetDays * day).toISOString();
  return [
    { code: "WELCOME10", description: "10% off your first order, up to ₹2,000", type: "percent" as const, value: 10, min_order_paise: 500000, max_discount_paise: 200000, starts_at: iso(-1), ends_at: null, usage_limit: null, per_user_limit: 1, is_active: true },
    { code: "FLAT1000", description: "₹1,000 off orders above ₹15,000", type: "flat" as const, value: 100000, min_order_paise: 1500000, max_discount_paise: null, starts_at: iso(-1), ends_at: iso(90), usage_limit: 1000, per_user_limit: 2, is_active: true },
    { code: "FESTIVE15", description: "15% off orders above ₹25,000, up to ₹5,000", type: "percent" as const, value: 15, min_order_paise: 2500000, max_discount_paise: 500000, starts_at: iso(-1), ends_at: iso(60), usage_limit: 500, per_user_limit: 1, is_active: true },
    { code: "EXPIRED5", description: "Expired coupon for testing", type: "percent" as const, value: 5, min_order_paise: 0, max_discount_paise: null, starts_at: iso(-60), ends_at: iso(-30), usage_limit: null, per_user_limit: null, is_active: true },
    { code: "PAUSED20", description: "Inactive coupon for testing", type: "percent" as const, value: 20, min_order_paise: 0, max_discount_paise: null, starts_at: iso(-1), ends_at: null, usage_limit: null, per_user_limit: null, is_active: false },
  ];
}
