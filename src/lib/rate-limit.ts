import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

// Fixed-window rate limiting backed by Postgres (public.hit_rate_limit), so
// limits hold across every app instance, including serverless ones.

type Limit = { key: (string | number)[]; max: number; per: number };

// Keys can contain user input (emails, IPs); hash them to a fixed size.
function bucket(key: (string | number)[]) {
  return createHash("sha256").update(key.join("\u0000").toLowerCase()).digest("hex").slice(0, 40);
}

// Counts one hit. True when within the limit. On limiter errors, signed-in
// actions fail open (an outage shouldn't lock everyone out); anonymous
// endpoints pass failClosed so a flood can't switch the limits off.
export async function withinRateLimit(key: string | (string | number)[], max: number, windowSeconds: number, opts?: { failClosed?: boolean }) {
  const { data, error } = await createAdminClient().rpc("hit_rate_limit", {
    p_bucket: bucket(Array.isArray(key) ? key : [key]),
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("Rate limit check failed", error);
    return !opts?.failClosed;
  }
  return data === true;
}

// All limits must pass; each one counts a hit.
export async function allowed(...limits: Limit[]) {
  for (const l of limits) {
    if (!(await withinRateLimit(l.key, l.max, l.per))) return false;
  }
  return true;
}

// Checks without counting, for limits that only count failures (sign-in).
export async function notExceeded(...limits: Limit[]) {
  const admin = createAdminClient();
  for (const l of limits) {
    const { data, error } = await admin.rpc("rate_limit_ok", { p_bucket: bucket(l.key), p_max: l.max, p_window_seconds: l.per });
    if (error) console.error("Rate limit check failed", error);
    else if (data === false) return false;
  }
  return true;
}

export const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";

// --- Client IP -------------------------------------------------------------------

// How many reverse proxies in front of the app append to X-Forwarded-For.
// The client is the entry that many hops from the right; anything further
// left was supplied by the client and can't be trusted. Vercel and most
// single-proxy setups: 1 (the default).
const TRUSTED_HOPS = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS) || 1);

export function clientIp(request: Request) {
  return ipFrom(request.headers);
}

// The same, for server actions (no Request object).
export async function requestIp() {
  return ipFrom(await headers());
}

function ipFrom(h: Headers) {
  const chain = (h.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const ip = chain.length ? chain[Math.max(0, chain.length - TRUSTED_HOPS)]! : (h.get("x-real-ip") ?? "unknown");
  return networkOf(ip.slice(0, 64));
}

// IPv6 users typically control a whole /64, so limits apply per /64.
export function networkOf(ip: string) {
  if (!ip.includes(":") || /^::ffff:\d+\.\d+\.\d+\.\d+$/i.test(ip)) return ip.replace(/^::ffff:/i, "");
  const [head, tail = ""] = ip.split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups = [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill("0"), ...right];
  return `${groups.slice(0, 4).map((g) => g.toLowerCase().replace(/^0+(?=.)/, "")).join(":")}::/64`;
}
