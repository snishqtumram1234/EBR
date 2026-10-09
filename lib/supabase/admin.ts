import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { supabaseServerEnv } from "@/lib/env";

/**
 * Service-role client. BYPASSES ROW LEVEL SECURITY.
 *
 * Use only where RLS must be bypassed: payment webhooks, payment
 * verification, order finalisation, the expiry job, refunds, and seeding.
 * Ordinary admin screens use the admin's own session (createClient from
 * ./server) so that RLS and the audit log see who acted.
 */
export function createAdminClient() {
  const env = supabaseServerEnv();
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
