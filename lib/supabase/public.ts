import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { publicEnv } from "@/lib/env.public";

/**
 * Anonymous, cookie-less client for public catalog reads. Because it does not
 * touch the request, results can be cached with "use cache". RLS applies as
 * the anon role, so it only ever sees active catalog rows.
 */
export function createPublicClient() {
  const env = publicEnv();
  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
}
