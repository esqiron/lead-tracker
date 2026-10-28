import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
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

// When a hosted form was rendered, for the too-fast-to-be-human check. The
// page renders per request (after connection()), so reading the clock is fine.
export function renderedAt() {
  return Date.now();
}
