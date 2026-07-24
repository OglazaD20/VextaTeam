import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { env } from "@/lib/env";

/**
 * Service-role client — bypasses RLS. Only for server-to-server contexts
 * with no user session to authenticate against (e.g. Google's calendar
 * webhook), never for anything reachable from a request carrying user input
 * without its own authorization check.
 */
export function createServiceClient() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  }

  return createSupabaseClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
