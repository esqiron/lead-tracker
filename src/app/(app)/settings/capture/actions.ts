"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSettingsAdmin } from "@/lib/auth";
import { API_KEY_PREFIX } from "@/lib/capture";
import { FORM_FIELD_KEYS, isSafeRedirect, readFields, toOrigin, type FormField } from "@/lib/capture-forms";
import { field, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { hashToken } from "@/lib/tokens";

// --- API keys ------------------------------------------------------------------

export type ApiKeyState = FormState & { key?: string };

export async function createApiKey(_: ApiKeyState, formData: FormData): Promise<ApiKeyState> {
  const { org } = await requireSettingsAdmin();
  const name = field(formData, "name");
  if (!name || name.length > 80) return { fieldErrors: { name: "Name the key after where it's used, e.g. “Website” or “Zapier”." } };

  const key = `${API_KEY_PREFIX}${randomBytes(24).toString("base64url")}`;
  const supabase = await createClient();
  const { error } = await supabase.from("api_keys").insert({
    org_id: org.id,
    name,
    key_prefix: key.slice(0, API_KEY_PREFIX.length + 6),
    key_hash: hashToken(key),
  });
  if (error) return { error: error.message };

  revalidatePath("/settings/capture");
  return { key, message: `Key “${name}” created.` };
}

export async function revokeApiKey(formData: FormData) {
  const { org } = await requireSettingsAdmin();
  const supabase = await createClient();
  await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", field(formData, "id"))
    .eq("org_id", org.id);
  revalidatePath("/settings/capture");
}

// --- Forms ---------------------------------------------------------------------

export async function saveCaptureForm(formId: string | null, _: FormState, formData: FormData): Promise<FormState> {
  const { org } = await requireSettingsAdmin();
  const name = field(formData, "name");
  const redirectUrl = field(formData, "redirect_url");
  const consentText = field(formData, "consent_text");

  const fieldErrors: Record<string, string> = {};
  if (!name || name.length > 80) fieldErrors.name = "Give the form a name up to 80 characters.";
  if (redirectUrl && !isSafeRedirect(redirectUrl)) fieldErrors.redirect_url = "Use a full address starting with https://";
  if (consentText.length > 1000) fieldErrors.consent_text = "Keep it under 1,000 characters.";

  const origins: string[] = [];
  for (const line of field(formData, "allowed_origins").split(/[\s,]+/).filter(Boolean)) {
    const origin = toOrigin(line);
    if (!origin) {
      fieldErrors.allowed_origins = `“${line.slice(0, 60)}” isn't a website address.`;
      break;
    }
    if (!origins.includes(origin)) origins.push(origin);
  }

  let fields: FormField[];
  try {
    fields = readFields(JSON.parse(String(formData.get("fields") ?? "[]")));
  } catch {
    fields = [];
  }
  if (!fields.length) fieldErrors.fields = "Show at least one field.";
  else if (!fields.some((f) => f.key === "email" || f.key === "first_name" || f.key === "last_name")) {
    fieldErrors.fields = "Include an email or name field so you can follow up.";
  }
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const values = {
    name,
    fields: fields.filter((f) => FORM_FIELD_KEYS.includes(f.key)),
    default_stage_id: field(formData, "default_stage_id") || null,
    default_source_id: field(formData, "default_source_id") || null,
    default_owner_id: field(formData, "owner_mode") === "fixed" ? field(formData, "default_owner_id") || null : null,
    round_robin: field(formData, "owner_mode") === "round_robin",
    consent_text: consentText || null,
    redirect_url: redirectUrl || null,
    allowed_origins: origins,
    notify_owner: formData.get("notify_owner") === "on",
    is_active: formData.get("is_active") === "on",
  };

  const supabase = await createClient();
  if (formId) {
    const { error } = await supabase.from("capture_forms").update(values).eq("id", formId).eq("org_id", org.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("capture_forms").insert({ ...values, org_id: org.id });
    if (error) return { error: error.message };
  }

  revalidatePath("/settings/capture");
  if (formId) {
    revalidatePath(`/settings/capture/forms/${formId}`);
    return { message: "Form saved." };
  }
  redirect("/settings/capture");
}

export async function deleteCaptureForm(formId: string): Promise<FormState> {
  const { org } = await requireSettingsAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("capture_forms").delete().eq("id", formId).eq("org_id", org.id);
  if (error) return { error: error.message };
  revalidatePath("/settings/capture");
  redirect("/settings/capture");
}
