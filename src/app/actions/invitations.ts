"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContext, homePath, isAdminRole } from "@/lib/auth";
import { actionEmail, isEmailConfigured, sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { escapeLike, field, isEmail, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { generateToken, hashToken } from "@/lib/tokens";
import { userMessage } from "@/lib/errors";
import { allowed, TOO_MANY } from "@/lib/rate-limit";
import { deploymentMode } from "@/lib/env";

// Invitations are sent from the setup wizard and from Settings → Members.

async function requireAdminOrg() {
  const ctx = await getContext();
  if (!ctx?.org || !isAdminRole(ctx.role)) redirect(await homePath(ctx));
  return { ...ctx, org: ctx.org };
}

function revalidateInvitePages() {
  revalidatePath("/onboarding/team");
  revalidatePath("/settings/members");
}

export type InviteResult = { email: string; url: string | null; emailed: boolean };
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
  if (rows.length > 20) return { error: "Invite up to 20 people at a time." };
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

  // Invitations send email: cap them per org so a compromised admin account
  // can't turn the server into a spam relay.
  for (let i = 0; i < rows.length; i++) {
    if (!(await allowed({ key: ["invites", org.id], max: 100, per: 3600 }))) return { error: TOO_MANY };
  }

  const emailEnabled = isEmailConfigured();
  // A hosted instance always has email: there, the emailed link is what proves
  // the invitee owns the address.
  if (!emailEnabled && deploymentMode() === "hosted") return { error: "Email must be set up to invite people." };
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
    if (error) return { error: userMessage(error), results };

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
    // With email set up the link is only ever emailed. That way receiving it
    // proves the invitee owns the address, and the admin never holds a link
    // that could create an account for someone else's email.
    results.push({ email: row.email, url: emailEnabled ? null : url, emailed });
  }

  revalidateInvitePages();
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
  revalidateInvitePages();
}

