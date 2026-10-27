import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

// Builds a one-time password reset link without sending anything, so it can
// be emailed through our SMTP or handed to an admin to share manually.
export async function createPasswordResetLink(email: string): Promise<string | null> {
  const { data, error } = await createAdminClient().auth.admin.generateLink({ type: "recovery", email });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) return null;

  const url = new URL("/auth/confirm", env.siteUrl);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", "recovery");
  url.searchParams.set("next", "/reset-password");
  return url.toString();
}
