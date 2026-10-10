"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { cancelMyOrder } from "@/lib/data/orders";
import { toAppError } from "@/lib/errors";

const schema = z.strictObject({ orderNumber: z.string().regex(/^ORD-[0-9]{3,12}$/) });

/** Customer cancels their own order until it ships. */
export async function cancelOrderAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = schema.safeParse({ orderNumber: formData.get("orderNumber") });
  if (!parsed.success) redirect("/orders");
  const { orderNumber } = parsed.data;

  let error = "";
  try {
    await cancelMyOrder(orderNumber, user.id);
  } catch (err) {
    error = toAppError(err).message;
  }
  revalidatePath(`/orders/${orderNumber}`);
  redirect(`/orders/${orderNumber}${error ? `?error=${encodeURIComponent(error)}` : ""}`);
}
