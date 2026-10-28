"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ORG_COOKIE, requireReadyOrg, requireSettingsAdmin } from "@/lib/auth";
import { actionEmail, isEmailConfigured, sendEmail } from "@/lib/email";
import { deploymentMode, env } from "@/lib/env";
import { field, validatePassword, type FormState } from "@/lib/forms";
import { createPasswordResetLink } from "@/lib/password-reset";
import { saveLeadSources, savePipelineStages } from "@/lib/pipeline-config";
import { createClient } from "@/lib/supabase/server";
import { userMessage } from "@/lib/errors";
import { allowed, TOO_MANY } from "@/lib/rate-limit";
import { logEvent } from "@/lib/audit";

// --- Organization -------------------------------------------------------------

export async function updateOrganization(_: FormState, formData: FormData): Promise<FormState> {
  const { org } = await requireSettingsAdmin();
  const name = field(formData, "name");
  const currency = field(formData, "currency").toUpperCase();
  const visibility = field(formData, "lead_visibility");

  const fieldErrors: Record<string, string> = {};
  if (!name || name.length > 120) fieldErrors.name = "Enter a name up to 120 characters.";
  if (!/^[A-Z]{3}$/.test(currency)) fieldErrors.currency = "Pick a currency.";
  if (visibility !== "all" && visibility !== "own") fieldErrors.lead_visibility = "Pick who can see leads.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      name,
      currency,
      timezone: field(formData, "timezone"),
      date_format: field(formData, "date_format"),
      lead_visibility: visibility as "all" | "own",
    })
    .eq("id", org.id);
  if (error) return { error: userMessage(error) };

  revalidatePath("/", "layout");
  return { message: "Saved." };
}

export async function deleteOrganization(_: FormState, formData: FormData): Promise<FormState> {
  const { org, role } = await requireReadyOrg();
  if (role !== "owner") return { error: "Only the owner can delete the organization." };
  if (field(formData, "confirm") !== org.name) return { fieldErrors: { confirm: `Type ${org.name} exactly to confirm.` } };

  const supabase = await createClient();
  const { error } = await supabase.from("organizations").delete().eq("id", org.id);
  if (error) return { error: userMessage(error) };

  (await cookies()).delete(ORG_COOKIE);
  redirect("/");
}

// --- Pipeline & sources ----------------------------------------------------------

export async function updatePipeline(_: FormState, formData: FormData): Promise<FormState> {
  const { org } = await requireSettingsAdmin();
  const error = await savePipelineStages(org.id, String(formData.get("stages") ?? "[]"));
  if (error) return { error };
  revalidatePath("/settings/pipeline");
  revalidatePath("/leads");
  return { message: "Pipeline saved." };
}

export async function updateSources(_: FormState, formData: FormData): Promise<FormState> {
  const { org } = await requireSettingsAdmin();
  const error = await saveLeadSources(org.id, String(formData.get("sources") ?? "[]"));
  if (error) return { error };
  revalidatePath("/settings/sources");
  return { message: "Lead sources saved." };
}

// --- Members -------------------------------------------------------------------

export async function changeMemberRole(membershipId: string, role: string): Promise<FormState> {
  await requireSettingsAdmin();
  if (role !== "admin" && role !== "member" && role !== "viewer") return { error: "Pick a role." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_member_role", { p_membership: membershipId, p_role: role });
  if (error) return { error: userMessage(error) };
  revalidatePath("/settings/members");
  return {};
}

export async function removeMember(membershipId: string): Promise<FormState> {
  const { user } = await requireReadyOrg();
  const supabase = await createClient();
  const { data: membership } = await supabase.from("memberships").select("user_id").eq("id", membershipId).maybeSingle();
  const { error } = await supabase.rpc("remove_member", { p_membership: membershipId });
  if (error) return { error: userMessage(error) };

  // Leaving yourself: go wherever is next for you (another org, or no access).
  if (membership?.user_id === user.id) {
    (await cookies()).delete(ORG_COOKIE);
    redirect("/");
  }
  revalidatePath("/settings/members");
  return {};
}

export async function transferOwnership(_: FormState, formData: FormData): Promise<FormState> {
  const { org, role } = await requireReadyOrg();
  if (role !== "owner") return { error: "Only the owner can transfer ownership." };
  const newOwner = field(formData, "user_id");
  if (!newOwner) return { error: "Pick the new owner." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("transfer_ownership", { p_org: org.id, p_new_owner: newOwner });
  if (error) return { error: userMessage(error) };
  revalidatePath("/settings", "layout");
  return { message: "Ownership transferred. You're now an admin." };
}

export type ResetState = FormState & { link?: string };

// Emails the member a reset link. Without SMTP, only the owner of a
// self-hosted instance may see the link itself: whoever holds it can sign in
// as that person, so it must not be handed to anyone with less authority.
export async function sendMemberPasswordReset(userId: string): Promise<ResetState> {
  const ctx = await requireSettingsAdmin();
  const supabase = await createClient();
  const { data: member } = await supabase
    .from("memberships")
    .select("role, profiles!memberships_user_id_fkey(email, full_name)")
    .eq("org_id", ctx.org.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!member) return { error: "That person isn't in this organization." };
  if (member.role === "owner" && ctx.role !== "owner") return { error: "Only the owner can reset the owner's password." };
  if (!(await allowed({ key: ["member-reset", userId], max: 3, per: 3600 }, { key: ["member-reset-org", ctx.org.id], max: 20, per: 3600 }))) {
    return { error: TOO_MANY };
  }

  const email = member.profiles.email;
  const url = await createPasswordResetLink(email);
  await logEvent({ orgId: ctx.org.id, actorId: ctx.user.id, action: "password_reset", entity: "profiles", entityId: userId, details: { emailed: isEmailConfigured() } });
  if (!url) return { error: "Couldn't create a reset link." };

  if (isEmailConfigured()) {
    const { html, text } = actionEmail({
      heading: "Reset your password",
      body: `An admin of ${ctx.org.name} sent you a link to choose a new Lead Tracker password. It works once and expires in an hour.`,
      buttonLabel: "Choose a new password",
      url,
      footer: "If you didn't expect this, you can ignore this email.",
    });
    await sendEmail({ to: email, subject: "Reset your Lead Tracker password", html, text });
    return { message: `Reset link sent to ${email}.` };
  }
  if (ctx.role === "owner" && deploymentMode() === "self_hosted") {
    return { link: url, message: `Share this link with ${email} only. It works once and expires in an hour.` };
  }
  return { error: "Email isn't set up on this server. Ask the owner to send a reset link." };
}

// --- Profile -------------------------------------------------------------------

export async function updateProfile(_: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireReadyOrg();
  const fullName = field(formData, "full_name");
  if (!fullName || fullName.length > 120) return { fieldErrors: { full_name: "Enter your name." } };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
  if (error) return { error: userMessage(error) };
  revalidatePath("/", "layout");
  return { message: "Saved." };
}

export async function changePassword(_: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireReadyOrg();
  const current = String(formData.get("current_password") ?? "");
  const next = String(formData.get("password") ?? "");
  const nextError = validatePassword(next, String(formData.get("confirm_password") ?? ""));
  if (nextError) return { fieldErrors: { password: nextError } };
  if (!(await allowed({ key: ["change-password", user.id], max: 5, per: 900 }))) return { error: TOO_MANY };

  // Check the current password on a throwaway client so the session in
  // cookies isn't touched if it's wrong.
  const probe = createSupabaseClient(env.supabaseUrl, env.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: wrong } = await probe.auth.signInWithPassword({ email: user.email, password: current });
  if (wrong) return { fieldErrors: { current_password: "That isn't your current password." } };
  await probe.auth.signOut({ scope: "local" });

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: next });
  // Supabase Auth's messages (e.g. "should be different") are written for users.
  if (error) return { error: error.message };
  await supabase.auth.signOut({ scope: "others" });
  return { message: "Password changed. Other devices have been signed out." };
}
