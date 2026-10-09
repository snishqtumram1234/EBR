import "server-only";
import { z } from "zod";

/**
 * Server-only configuration. Importing this module from a Client Component
 * fails the build (via "server-only"), and scripts/check-client-secrets.mjs
 * additionally fails the build if a client file references these names.
 *
 * Each group is validated on first use, so a missing Razorpay key does not
 * break pages that never touch payments.
 */

function load<T extends z.ZodType>(group: string, schema: T, values: Record<string, unknown>): z.infer<T> {
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    // Name the variables, never print their values.
    const names = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Missing or invalid ${group} environment variables: ${names}. See .env.example.`);
  }
  return parsed.data;
}

const supabaseSchema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
});

const razorpaySchema = z.object({
  RAZORPAY_KEY_ID: z.string().regex(/^rzp_(test|live)_/, "must start with rzp_test_ or rzp_live_"),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1),
});

let supabaseCache: z.infer<typeof supabaseSchema> | undefined;
let razorpayCache: z.infer<typeof razorpaySchema> | undefined;

export function supabaseServerEnv() {
  supabaseCache ??= load("Supabase", supabaseSchema, {
    SUPABASE_URL: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  });
  return supabaseCache;
}

export function razorpayEnv() {
  razorpayCache ??= load("Razorpay", razorpaySchema, {
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
  });
  return razorpayCache;
}

export const isProduction = process.env.NODE_ENV === "production";
