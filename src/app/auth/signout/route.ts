import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ORG_COOKIE } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const next = request.nextUrl.searchParams.get("next");
  const target = next?.startsWith("/invite/") ? next : "/login";
  const response = NextResponse.redirect(new URL(target, request.url), { status: 303 });
  response.cookies.delete(ORG_COOKIE);
  return response;
}
