import "server-only";

// Route handlers don't get the Origin check Next gives server actions, and
// the voice routes change data and spend paid credits: only accept requests
// from the app's own pages.
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
