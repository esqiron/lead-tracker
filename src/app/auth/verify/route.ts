import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Verifies a password recovery token (POST from /auth/confirm) and signs the
// user in for /reset-password. Only recovery tokens, and always to the reset
// page: the token can't be used to sign in elsewhere or redirect off-site.
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const tokenHash = form.get("token_hash");
  const fail = NextResponse.redirect(new URL("/login?error=link_invalid", request.url), 303);
  if (typeof tokenHash !== "string" || !/^[0-9a-f]{20,128}$/i.test(tokenHash)) return fail;

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
  if (error) return fail;
  return NextResponse.redirect(new URL("/reset-password", request.url), 303);
}
