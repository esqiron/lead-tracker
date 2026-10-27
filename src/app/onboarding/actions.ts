"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  canCreateOrganization,
  getContext,
  homePath,
  isAdminRole,
  setActiveOrg,
  type Organization,
} from "@/lib/auth";
import { actionEmail, isEmailConfigured, sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { escapeLike, field, isEmail, type FormState } from "@/lib/forms";
import { nextStep, stepIndex, type WizardStep } from "@/lib/onboarding";
import { generateToken, hashToken } from "@/lib/tokens";

async function requireAdminOrg() {
  const ctx = await getContext();
  if (!ctx?.org || !isAdminRole(ctx.role)) redirect(await homePath(ctx));
  return { ...ctx, org: ctx.org };
}

// Moves the saved wizard position forward, never backward, so revisiting an
// earlier step doesn't lose progress.
async function advance(org: Organization, from: WizardStep) {
  const target = nextStep(from);
  if (stepIndex(target) > stepIndex(org.setup_step)) {
    const supabase = await createClient();
    await supabase.from("organizations").update({ setup_step: target }).eq("id", org.id);
  }
}

// --- Step 1: organization ----------------------------------------------------

export async function saveOrganization(_: FormState, formData: FormData): Promise<FormState> {
  const name = field(formData, "name");
  const currency = field(formData, "currency").toUpperCase();
  const timezone = field(formData, "timezone");
  const dateFormat = field(formData, "date_format");

  const fieldErrors: Record<string, string> = {};
  if (!name || name.length > 120) fieldErrors.name = "Enter a name up to 120 characters.";
  if (!/^[A-Z]{3}$/.test(currency)) fieldErrors.currency = "Pick a currency.";
  if (!timezone) fieldErrors.timezone = "Pick a time zone.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const ctx = await getContext();
  if (!ctx) redirect("/login");
  const supabase = await createClient();

  if (ctx.org) {
    if (!isAdminRole(ctx.role)) redirect(await homePath(ctx));
    const { error } = await supabase
      .from("organizations")
      .update({ name, currency, timezone, date_format: dateFormat })
      .eq("id", ctx.org.id);
    if (error) return { error: error.message };
  } else {
    if (!(await canCreateOrganization())) redirect("/no-access");
    const { data: orgId, error } = await supabase.rpc("create_organization", {
      p_name: name,
      p_currency: currency,
      p_timezone: timezone,
      p_date_format: dateFormat,
    });
    if (error || !orgId) return { error: error?.message ?? "Couldn't create the organization." };
    await setActiveOrg(orgId);
  }

  redirect("/onboarding/pipeline");
}

// --- Step 2: pipeline --------------------------------------------------------

type StageInput = { id?: string; name: string; probability: number; kind: "open" | "won" | "lost" };

export async function savePipeline(_: FormState, formData: FormData): Promise<FormState> {
  const { org } = await requireAdminOrg();

  let stages: StageInput[];
  try {
    stages = JSON.parse(String(formData.get("stages") ?? "[]"));
  } catch {
    return { error: "Something went wrong reading the stages. Reload and try again." };
  }

  const names = new Set<string>();
  for (const stage of stages) {
    const name = stage.name?.trim();
    if (!name) return { error: "Every stage needs a name." };
    if (name.length > 60) return { error: `"${name.slice(0, 20)}…" is too long. Keep stage names under 60 characters.` };
    if (names.has(name.toLowerCase())) return { error: `There are two stages called "${name}".` };
    names.add(name.toLowerCase());
    if (!(stage.probability >= 0 && stage.probability <= 100)) {
      return { error: `Win probability for "${name}" must be between 0 and 100.` };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_pipeline_stages", { p_org: org.id, p_stages: stages });
  if (error) return { error: error.message };

  await advance(org, "pipeline");
  redirect("/onboarding/sources");
}

// --- Step 3: lead sources ----------------------------------------------------

export async function saveSources(_: FormState, formData: FormData): Promise<FormState> {
  const { org } = await requireAdminOrg();

  let sources: { id?: string; name: string }[];
  try {
    sources = JSON.parse(String(formData.get("sources") ?? "[]"));
  } catch {
    return { error: "Something went wrong reading the sources. Reload and try again." };
  }

  const names = new Set<string>();
  for (const source of sources) {
    const name = source.name?.trim();
    if (!name) return { error: "Every source needs a name." };
    if (name.length > 60) return { error: "Keep source names under 60 characters." };
    if (names.has(name.toLowerCase())) return { error: `"${name}" is listed twice.` };
    names.add(name.toLowerCase());
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_lead_sources", { p_org: org.id, p_sources: sources });
  if (error) return { error: error.message };

  await advance(org, "sources");
  redirect("/onboarding/team");
}

// --- Step 4: team ------------------------------------------------------------

export type InviteResult = { email: string; url: string; emailed: boolean };
export type InviteState = FormState & { results?: InviteResult[] };

const INVITABLE_ROLES = ["admin", "member", "viewer"] as const;
type InvitableRole = (typeof INVITABLE_ROLES)[number];

export async function sendInvitations(_: InviteState, formData: FormData): Promise<InviteState> {
  const { org, user } = await requireAdminOrg();

  const emails = formData.getAll("email").map((v) => String(v).trim().toLowerCase());
  const roles = formData.getAll("role").map(String);
  const rows = emails
    .map((email, i) => ({ email, role: roles[i] as InvitableRole }))
    .filter((row) => row.email);

  if (!rows.length) return { error: "Add at least one email address." };
  const invalid = rows.find((row) => !isEmail(row.email));
  if (invalid) return { error: `"${invalid.email}" isn't a valid email address.` };
  if (rows.some((row) => !INVITABLE_ROLES.includes(row.role))) return { error: "Pick a role for everyone." };
  if (new Set(rows.map((r) => r.email)).size !== rows.length) return { error: "The same email is listed twice." };

  const supabase = await createClient();

  const { data: members } = await supabase
    .from("memberships")
    .select("profiles!inner(email)")
    .eq("org_id", org.id);
  const memberEmails = new Set(members?.map((m) => m.profiles.email.toLowerCase()));
  const alreadyMember = rows.find((row) => memberEmails.has(row.email));
  if (alreadyMember) return { error: `${alreadyMember.email} is already in ${org.name}.` };

  const emailEnabled = isEmailConfigured();
  const inviter = user.fullName ?? user.email;
  const results: InviteResult[] = [];

  for (const row of rows) {
    // Re-inviting replaces the previous pending invite (and its link).
    await supabase
      .from("invitations")
      .update({ revoked_at: new Date().toISOString() })
      .eq("org_id", org.id)
      .ilike("email", escapeLike(row.email))
      .is("accepted_at", null)
      .is("revoked_at", null);

    const token = generateToken();
    const { error } = await supabase.from("invitations").insert({
      org_id: org.id,
      email: row.email,
      role: row.role,
      token_hash: hashToken(token),
      invited_by: user.id,
    });
    if (error) return { error: error.message, results };

    const url = `${env.siteUrl}/invite/${token}`;
    let emailed = false;
    if (emailEnabled) {
      const { html, text } = actionEmail({
        heading: `Join ${org.name} on Lead Tracker`,
        body: `${inviter} invited you to join ${org.name} as ${row.role === "admin" ? "an admin" : `a ${row.role}`}. The invitation expires in 7 days.`,
        buttonLabel: "Accept invitation",
        url,
        footer: "If you weren't expecting this, you can ignore this email.",
      });
      try {
        await sendEmail({ to: row.email, subject: `${inviter} invited you to ${org.name}`, html, text });
        emailed = true;
      } catch (err) {
        console.error("Failed to send invitation email", err);
      }
    }
    results.push({ email: row.email, url, emailed });
  }

  revalidatePath("/onboarding/team");
  return { results };
}

export async function revokeInvitation(formData: FormData) {
  const { org } = await requireAdminOrg();
  const supabase = await createClient();
  await supabase
    .from("invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", field(formData, "id"))
    .eq("org_id", org.id);
  revalidatePath("/onboarding/team");
}

export async function continueFromTeam() {
  const { org } = await requireAdminOrg();
  await advance(org, "team");
  redirect("/onboarding/import");
}

// --- Step 5: finish ----------------------------------------------------------

export async function finishSetup(formData: FormData) {
  const { org } = await requireAdminOrg();
  const supabase = await createClient();

  if (field(formData, "mode") === "sample") {
    const { error } = await supabase.rpc("load_sample_data", { p_org: org.id });
    if (error) throw new Error(error.message);
  }

  const { error } = await supabase
    .from("organizations")
    .update({ setup_step: "done", setup_completed_at: new Date().toISOString() })
    .eq("id", org.id);
  if (error) throw new Error(error.message);

  redirect("/dashboard");
}
