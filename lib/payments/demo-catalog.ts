import "server-only";
import { z } from "zod";
import { MAX_LINE_QUANTITY } from "@/lib/config";
import { AppError } from "@/lib/errors";

/**
 * TEMPORARY server-side price list so payments can be tested before the
 * database is connected. The browser sends only product ids and quantities;
 * prices come from here. When the database is connected, checkout reads
 * prices from Postgres via the order-creation function and this file is deleted.
 */
export const DEMO_PRODUCTS = [
  { id: "oslo-3-seater-fabric-sofa", name: "Oslo 3 Seater Fabric Sofa", pricePaise: 4499900, mrpPaise: 5299900, material: "Fabric, Ash Grey", hex: "#8A8D8F" },
  { id: "ergo-pro-high-back-office-chair", name: "Ergo Pro High Back Office Chair", pricePaise: 1499900, mrpPaise: 1899900, material: "Mesh, Black", hex: "#2B2B2B" },
  { id: "terracotta-planter-set-set-of-3", name: "Terracotta Planter Set (Set of 3)", pricePaise: 249900, mrpPaise: 299900, material: "Terracotta", hex: "#C8643B" },
  { id: "test-item-one-rupee", name: "Test item (₹1)", pricePaise: 100, mrpPaise: 100, material: "For payment testing", hex: "#B5A48B" },
] as const;

export type DemoProductId = (typeof DEMO_PRODUCTS)[number]["id"];

export function findDemoProduct(id: string) {
  return DEMO_PRODUCTS.find((p) => p.id === id);
}

/** Request body shared by every payment method: ids and quantities only. */
export const demoItemsSchema = z.strictObject({
  items: z
    .array(
      z.strictObject({
        productId: z.string().min(1).max(100),
        quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
      }),
    )
    .min(1)
    .max(20),
});

/** Total in paise, computed from server prices only. */
export function priceDemoItems(items: z.infer<typeof demoItemsSchema>["items"]): number {
  let amountPaise = 0;
  for (const item of items) {
    const product = findDemoProduct(item.productId);
    if (!product) throw new AppError("NOT_FOUND", `Unknown product: ${item.productId}`);
    amountPaise += product.pricePaise * item.quantity;
  }
  return amountPaise;
}
