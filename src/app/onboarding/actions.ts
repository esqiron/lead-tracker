"use server";

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
import { field, type FormState } from "@/lib/forms";
import { nextStep, stepIndex, type WizardStep } from "@/lib/onboarding";
import { saveLeadSources, savePipelineStages } from "@/lib/pipeline-config";

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

export async function savePipeline(_: FormState, formData: FormData): Promise<FormState> {
  const { org } = await requireAdminOrg();
  const error = await savePipelineStages(org.id, String(formData.get("stages") ?? "[]"));
  if (error) return { error };

  await advance(org, "pipeline");
  redirect("/onboarding/sources");
}

// --- Step 3: lead sources ----------------------------------------------------

export async function saveSources(_: FormState, formData: FormData): Promise<FormState> {
  const { org } = await requireAdminOrg();
  const error = await saveLeadSources(org.id, String(formData.get("sources") ?? "[]"));
  if (error) return { error };

  await advance(org, "sources");
  redirect("/onboarding/team");
}

// --- Step 4: team ------------------------------------------------------------

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

  redirect(field(formData, "mode") === "csv" ? "/contacts/import" : "/dashboard");
}
