/**
 * TEMPORARY delivery rules (mirroring the seed data) until the database is
 * connected. Not secret, so the browser may import them for display; the
 * server re-applies them before charging.
 */
export const DEMO_DELIVERY = {
  standard: { name: "Standard Delivery", pricePaise: 0, days: "5 to 7 days" },
  express: { name: "Express Delivery", pricePaise: 49900, days: "2 to 3 days" },
} as const;

export type DeliveryMethod = keyof typeof DEMO_DELIVERY;

/** Pune city and PCMC (411001-411062) get Express, as in the seed data. */
export function expressAvailable(pincode: string): boolean {
  const n = Number(pincode);
  return /^[1-9][0-9]{5}$/.test(pincode) && n >= 411001 && n <= 411062;
}
