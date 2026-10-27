import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env, supabaseSecretKey } from "@/lib/env";
import type { Database } from "@/lib/database.types";

// Bypasses RLS. Only for the few server-side flows that act before a user
// exists or on behalf of the system: creating the first owner, creating
// invited accounts, and generating password reset links.
export function createAdminClient() {
  return createClient<Database>(env.supabaseUrl, supabaseSecretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
