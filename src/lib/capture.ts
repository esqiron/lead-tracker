import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { actionEmail, isEmailConfigured, sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { isEmail } from "@/lib/forms";
import { splitName } from "@/lib/import-parse";
import { hashToken } from "@/lib/tokens";

// Shared by the public API and hosted forms. Captured leads are written with
// the service role because there's no signed-in user; every function here
// scopes its work to the org resolved from the API key or form.

export type CaptureInput = {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  message?: string;
  lead_title?: string;
  value?: number;
  stage?: string;
  source?: string;
  owner_email?: string;
  tags?: string[];
  consent?: boolean;
};

const TEXT_LIMITS = {
  first_name: 100,
  last_name: 100,
  email: 254,
  phone: 50,
  company: 200,
  title: 120,
  message: 5000,
  lead_title: 200,
  stage: 60,
  source: 60,
  owner_email: 254,
} as const;

export const CAPTURE_FIELDS = Object.keys(TEXT_LIMITS) as (keyof typeof TEXT_LIMITS)[];

const TRUTHY = new Set(["true", "on", "yes", "1"]);

// Validates untrusted input (JSON body or form fields). Unknown keys are ignored.
export function validateCapture(raw: Record<string, unknown>): { data: CaptureInput } | { errors: Record<string, string> } {
  const data: CaptureInput = {};
  const errors: Record<string, string> = {};

  for (const key of CAPTURE_FIELDS) {
    const value = raw[key];
    if (value === undefined || value === null || value === "") continue;
    if (typeof value !== "string" && typeof value !== "number") {
      errors[key] = "Must be text.";
      continue;
    }
    const text = String(value).trim();
    if (!text) continue;
    if (text.length > TEXT_LIMITS[key]) {
      errors[key] = `Must be at most ${TEXT_LIMITS[key]} characters.`;
      continue;
    }
    data[key] = text;
  }

  // A single "name" field is accepted too.
  if (!data.first_name && !data.last_name && typeof raw.name === "string" && raw.name.trim()) {
    const { first, last } = splitName(raw.name.slice(0, 200));
    data.first_name = first || undefined;
    data.last_name = last || undefined;
  }

  if (data.email) {
    data.email = data.email.toLowerCase();
    if (!isEmail(data.email)) errors.email = "Must be a valid email address.";
  }
  if (data.owner_email) data.owner_email = data.owner_email.toLowerCase();

  if (raw.value !== undefined && raw.value !== null && raw.value !== "") {
    const n = Number(typeof raw.value === "string" ? raw.value.replace(/[\s,]/g, "") : raw.value);
    if (!Number.isFinite(n) || n < 0 || n >= 1e12) errors.value = "Must be a positive number.";
    else data.value = Math.round(n * 100) / 100;
  }

  if (raw.tags !== undefined) {
    const list = Array.isArray(raw.tags) ? raw.tags : typeof raw.tags === "string" ? raw.tags.split(",") : null;
    if (!list || list.some((t) => typeof t !== "string")) errors.tags = "Must be a list of strings.";
    else {
      const tags = [...new Set(list.map((t) => (t as string).trim().toLowerCase()).filter(Boolean))];
      if (tags.length > 20 || tags.some((t) => t.length > 40)) errors.tags = "Up to 20 tags, 40 characters each.";
      else data.tags = tags;
    }
  }

  if (raw.consent !== undefined) {
    data.consent = raw.consent === true || (typeof raw.consent === "string" && TRUTHY.has(raw.consent.toLowerCase()));
  }

  if (!data.first_name && !data.last_name && !data.email && !errors.email) {
    errors.email = "Provide at least a name or an email.";
  }

  return Object.keys(errors).length ? { errors } : { data };
}

export type CaptureResult = { lead_id: string; contact_id: string; owner_id: string | null; contact_created: boolean };

export async function captureLead(orgId: string, data: CaptureInput, opts: { formId?: string; apiKeyId?: string }) {
  const { data: result, error } = await createAdminClient().rpc("capture_lead", {
    p_org: orgId,
    p_payload: data,
    p_form: opts.formId,
    p_api_key: opts.apiKeyId,
  });
  if (error) throw new Error(error.message);
  return result as CaptureResult;
}

// Emails the lead's owner, if email is set up. Never throws: a failed
// notification shouldn't fail the capture.
export async function notifyLeadOwner(orgId: string, result: CaptureResult, data: CaptureInput, via: string) {
  if (!isEmailConfigured() || !result.owner_id) return;
  try {
    const admin = createAdminClient();
    const [{ data: owner }, { data: org }] = await Promise.all([
      admin.from("profiles").select("email").eq("id", result.owner_id).single(),
      admin.from("organizations").select("name").eq("id", orgId).single(),
    ]);
    if (!owner || !org) return;
    const who = ([data.first_name, data.last_name].filter(Boolean).join(" ") || data.email || "Someone").slice(0, 60);
    const { html, text } = actionEmail({
      heading: `New lead: ${who}`,
      // Submitter text stays out of the email (it's unverified and could be
      // phishing); it's on the lead's timeline instead.
      body: `A new lead came in through ${via} and was assigned to you in ${org.name}.${data.message ? " They left a message, shown on the lead." : ""}`,
      buttonLabel: "Open the lead",
      url: `${env.siteUrl}/leads/${result.lead_id}`,
      footer: "You're getting this because new leads from this source are assigned to you.",
    });
    await sendEmail({ to: owner.email, subject: `New lead: ${who}`, html, text });
  } catch (err) {
    console.error("Failed to send new-lead notification", err);
  }
}

// --- API keys ----------------------------------------------------------------------

export const API_KEY_PREFIX = "lt_";

export async function authenticateApiKey(request: Request): Promise<{ id: string; orgId: string } | null> {
  const header = request.headers.get("authorization") ?? "";
  const key = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : (request.headers.get("x-api-key") ?? "").trim();
  if (!key.startsWith(API_KEY_PREFIX) || key.length > 200) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("api_keys")
    .select("id, org_id, organizations!inner(setup_completed_at)")
    .eq("key_hash", hashToken(key))
    .is("revoked_at", null)
    .maybeSingle();
  if (!data?.organizations.setup_completed_at) return null;

  await admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return { id: data.id, orgId: data.org_id };
}

