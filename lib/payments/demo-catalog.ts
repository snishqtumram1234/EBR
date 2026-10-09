import "server-only";

/**
 * TEMPORARY server-side price list so payments can be tested before the
 * database is connected. The browser sends only product ids and quantities;
 * prices come from here. When the database is connected, checkout reads
 * prices from Postgres via the order-creation function and this file is deleted.
 */
export const DEMO_PRODUCTS = [
  { id: "oslo-3-seater-fabric-sofa", name: "Oslo 3 Seater Fabric Sofa", pricePaise: 4499900 },
  { id: "ergo-pro-high-back-office-chair", name: "Ergo Pro High Back Office Chair", pricePaise: 1499900 },
  { id: "terracotta-planter-set-set-of-3", name: "Terracotta Planter Set (Set of 3)", pricePaise: 249900 },
  { id: "test-item-one-rupee", name: "Test item (₹1)", pricePaise: 100 },
] as const;

export type DemoProductId = (typeof DEMO_PRODUCTS)[number]["id"];

export function findDemoProduct(id: string) {
  return DEMO_PRODUCTS.find((p) => p.id === id);
}
