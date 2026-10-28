import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { sessionCookieOptions } from "@/lib/supabase/cookies";

// Paths reachable without a session.
// /api/v1 and /f are the public lead capture API and hosted forms.
const PUBLIC_PATHS = ["/login", "/setup", "/forgot-password", "/auth", "/invite", "/api/v1", "/f"];

function matches(pathname: string, paths: string[]) {
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.supabaseUrl, env.supabasePublishableKey, {
    cookieOptions: sessionCookieOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Refreshes the session if needed. Don't run code between createServerClient
  // and getClaims(), or users may be signed out at random.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    if (path === "/login" && pathname !== "/") {
      url.searchParams.set("next", pathname + search);
    }
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  };

  // Only an optimistic check: the JWT can outlive its user. Pages verify the
  // user with the auth server (and send signed-in people away from /login).
  if (!signedIn && !matches(pathname, PUBLIC_PATHS)) {
    return redirectTo("/login");
  }

  return response;
}
