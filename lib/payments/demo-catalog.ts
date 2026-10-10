import "server-only";
import { z } from "zod";
import { MAX_LINE_QUANTITY } from "@/lib/config";
import { AppError } from "@/lib/errors";
import { PRODUCTS, findProduct } from "@/lib/catalog/products";

/**
 * TEMPORARY server-side pricing until the database is connected. The browser
 * sends only product ids and quantities; prices come from lib/catalog.
 */
export const DEMO_PRODUCTS = PRODUCTS.map((p) => ({ id: p.id, name: p.name, pricePaise: p.pricePaise }));

export function findDemoProduct(id: string) {
  return findProduct(id);
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
