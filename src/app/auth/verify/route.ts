import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Where each kind of token leads once verified.
const NEXT = { recovery: "/reset-password", signup: "/onboarding" } as const;

// Verifies a password recovery or sign-up confirmation token (POST from
// /auth/confirm) and signs the user in. Each kind always goes to its own fixed
// page: a token can't be used to redirect elsewhere or off-site.
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const tokenHash = form.get("token_hash");
  const type = form.get("type") === "signup" ? "signup" : "recovery";
  const fail = NextResponse.redirect(new URL(`/login?error=${type === "signup" ? "signup_link_invalid" : "link_invalid"}`, request.url), 303);
  if (typeof tokenHash !== "string" || !/^[0-9a-f]{20,128}$/i.test(tokenHash)) return fail;

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) return fail;
  return NextResponse.redirect(new URL(NEXT[type], request.url), 303);
}
