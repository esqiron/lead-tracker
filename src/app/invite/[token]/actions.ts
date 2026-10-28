"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { setActiveOrg } from "@/lib/auth";
import { field, validatePassword, type FormState } from "@/lib/forms";
import { userMessage } from "@/lib/errors";
import { allowed, requestIp, TOO_MANY } from "@/lib/rate-limit";

async function pendingInvitation(token: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_invitation", { p_token: token });
  const invite = data?.[0];
  return invite?.status === "pending" ? invite : null;
}

async function acceptAndEnter(token: string): Promise<FormState> {
  const supabase = await createClient();
  const { data: orgId, error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error || !orgId) return { error: userMessage(error, "Couldn't accept the invitation.") };

  await setActiveOrg(orgId);
  redirect("/");
}

export async function acceptInvitation(token: string): Promise<FormState> {
  return acceptAndEnter(token);
}

export async function signInAndAccept(token: string, _: FormState, formData: FormData): Promise<FormState> {
  if (!(await allowed({ key: ["invite-ip", await requestIp()], max: 10, per: 600 }, { key: ["invite-token", token.slice(0, 16)], max: 10, per: 3600 }))) {
    return { error: TOO_MANY };
  }
  const invite = await pendingInvitation(token);
  if (!invite) return { error: "This invitation is no longer valid." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: invite.email,
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: "That password isn't right." };

  return acceptAndEnter(token);
}

// The invite link proves the person controls the address, so the account is
// created already confirmed.
export async function createAccountAndAccept(token: string, _: FormState, formData: FormData): Promise<FormState> {
  if (!(await allowed({ key: ["invite-ip", await requestIp()], max: 10, per: 600 }))) return { error: TOO_MANY };
  const invite = await pendingInvitation(token);
  if (!invite) return { error: "This invitation is no longer valid." };

  const fullName = field(formData, "full_name");
  const password = String(formData.get("password") ?? "");
  const fieldErrors: Record<string, string> = {};
  if (!fullName) fieldErrors.full_name = "Enter your name.";
  const passwordError = validatePassword(password, String(formData.get("confirm_password") ?? ""));
  if (passwordError) fieldErrors.password = passwordError;
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const { error: createError } = await createAdminClient().auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createError) {
    return { error: "An account with this email already exists. Reload the page to sign in instead." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: invite.email, password });
  if (error) return { error: userMessage(error) };

  return acceptAndEnter(token);
}
