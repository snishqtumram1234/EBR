/**
 * Promote (or demote) an existing account.
 *
 *   npm run make-admin -- you@example.com
 *   npm run make-admin -- you@example.com --revoke
 *
 * The account must already exist (sign up through the site first).
 * Uses the secret key from .env.local; role is stored on public.profiles,
 * which customers cannot modify.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types";

config({ path: ".env.local", quiet: true });

const email = process.argv.slice(2).find((a) => !a.startsWith("--"))?.toLowerCase();
const revoke = process.argv.includes("--revoke");
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!email) {
  console.error("Usage: npm run make-admin -- you@example.com [--revoke]");
  process.exit(1);
}
if (!url || !secret) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local first.");
  process.exit(1);
}

const db = createClient<Database>(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  let userId: string | undefined;
  for (let page = 1; page < 100 && !userId; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id;
    if (data.users.length < 200) break;
  }
  if (!userId) {
    console.error(`No account found for ${email}. Sign up on the site first.`);
    process.exit(1);
  }

  const role = revoke ? "customer" : "admin";
  const { error } = await db.from("profiles").update({ role }).eq("id", userId);
  if (error) throw new Error(error.message);
  console.log(`${email} is now ${role === "admin" ? "an admin" : "a customer"}.`);
}

main().catch((err: unknown) => {
  console.error("Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
