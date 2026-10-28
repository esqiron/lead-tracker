import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { env, supabaseSecretKey } from "@/lib/env";
import { readFields } from "@/lib/capture-fields";

export { FORM_FIELD_KEYS, readFields, type FormField, type FormFieldKey } from "@/lib/capture-fields";

// Hosted capture forms: public, looked up by public_id with the service role
// (visitors have no session, and RLS hides forms from anonymous users).

export async function getPublicForm(publicId: string) {
  if (!/^[0-9a-f]{32}$/.test(publicId)) return null;
  const { data } = await createAdminClient()
    .from("capture_forms")
    .select("id, org_id, public_id, name, fields, consent_text, redirect_url, allowed_origins, notify_owner, is_active, organizations!inner(name, setup_completed_at)")
    .eq("public_id", publicId)
    .maybeSingle();
  if (!data?.is_active || !data.organizations.setup_completed_at) return null;
  return { ...data, fields: readFields(data.fields) };
}

export function siteOrigin() {
  return new URL(env.siteUrl).origin;
}

// Normalizes "https://example.com/contact" → "https://example.com".
export function toOrigin(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : null;
  } catch {
    return null;
  }
}

export function isSafeRedirect(value: string | null): value is string {
  return Boolean(value && /^https?:\/\//i.test(value));
}

// Signed "rendered at" token for the hosted form page, so the too-fast check
// can't be faked by sending any timestamp. The page renders per request
// (after connection()), so reading the clock here is fine.
function tokenKey() {
  return createHash("sha256").update(`lt-form-token:${supabaseSecretKey()}`).digest();
}

function sign(publicId: string, ts: string) {
  return createHmac("sha256", tokenKey()).update(`${publicId}.${ts}`).digest("base64url").slice(0, 32);
}

export function formToken(publicId: string) {
  const ts = String(Date.now());
  return `${ts}.${sign(publicId, ts)}`;
}

// "missing" (custom HTML embeds can't include it), "ok", or "bot" (forged,
// expired, or submitted faster than a person could fill the form).
export function checkFormToken(publicId: string, token: unknown): "missing" | "ok" | "bot" {
  if (typeof token !== "string" || !token) return "missing";
  const [ts, sig] = token.split(".");
  if (!ts || !sig || sig.length !== 32) return "bot";
  const expected = Buffer.from(sign(publicId, ts));
  if (!timingSafeEqual(expected, Buffer.from(sig.padEnd(32).slice(0, 32)))) return "bot";
  const age = Date.now() - Number(ts);
  return age >= 2000 && age <= 24 * 3600 * 1000 ? "ok" : "bot";
}

// Fixed messages for the hosted form page; the URL only carries a code.
export const FORM_ERRORS = {
  unavailable: "This form isn't available.",
  origin: "This site isn't allowed to use this form.",
  unreadable: "The submission couldn't be read.",
  too_large: "The submission is too large.",
  rate: "Too many submissions. Please try again in a few minutes.",
  consent: "Please accept the consent statement.",
  required: "Please fill in all required fields.",
  invalid: "Please check the email address and try again.",
  failed: "Something went wrong. Please try again.",
} as const;
export type FormErrorCode = keyof typeof FORM_ERRORS;
