"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { instanceInitialized } from "@/lib/auth";
import { actionEmail, isEmailConfigured, sendEmail } from "@/lib/email";
import { createPasswordResetLink } from "@/lib/password-reset";
import { field, isEmail, safeNext, validatePassword, type FormState } from "@/lib/forms";

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const email = field(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "That email and password don't match." };

  redirect(safeNext(field(formData, "next")));
}

// Creates the very first account on a fresh instance. That person becomes
// the owner of the organization they create in the wizard.
export async function createFirstOwner(_: FormState, formData: FormData): Promise<FormState> {
  const fullName = field(formData, "full_name");
  const email = field(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");

  const fieldErrors: Record<string, string> = {};
  if (!fullName) fieldErrors.full_name = "Enter your name.";
  if (!isEmail(email)) fieldErrors.email = "Enter a valid email address.";
  const passwordError = validatePassword(password, String(formData.get("confirm_password") ?? ""));
  if (passwordError) fieldErrors.password = passwordError;
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  if (await instanceInitialized()) {
    return { error: "This server is already set up. Sign in, or ask an admin for an invite." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) return { error: error?.message ?? "Couldn't create the account." };

  // Two people racing through /setup: keep the first, undo the second.
  const { count } = await admin.from("profiles").select("id", { count: "exact", head: true });
  if ((count ?? 0) > 1) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: "Someone else just finished setting up this server. Ask them for an invite." };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) redirect("/login?next=/onboarding/organization");
  redirect("/onboarding/organization");
}

export async function requestPasswordReset(_: FormState, formData: FormData): Promise<FormState> {
  const email = field(formData, "email").toLowerCase();
  if (!isEmail(email)) return { fieldErrors: { email: "Enter a valid email address." } };

  if (!isEmailConfigured()) {
    return {
      error: "Email isn't set up on this server yet. Ask an admin of your workspace for a reset link.",
    };
  }

  const url = await createPasswordResetLink(email);
  if (url) {
    const { html, text } = actionEmail({
      heading: "Reset your password",
      body: "Someone asked to reset the password for your Lead Tracker account. The link works once and expires in an hour.",
      buttonLabel: "Choose a new password",
      url,
      footer: "If you didn't ask for this, you can ignore this email.",
    });
    await sendEmail({ to: email, subject: "Reset your Lead Tracker password", html, text });
  }

  // Same answer either way, so this form can't be used to probe for accounts.
  return { message: "If there's an account for that email, a reset link is on its way." };
}

export async function updatePassword(_: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  const passwordError = validatePassword(password, String(formData.get("confirm_password") ?? ""));
  if (passwordError) return { fieldErrors: { password: passwordError } };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  redirect("/");
}
