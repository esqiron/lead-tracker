"use server";

import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { instanceInitialized } from "@/lib/auth";
import { actionEmail, isEmailConfigured, sendEmail } from "@/lib/email";
import { createPasswordResetLink } from "@/lib/password-reset";
import { field, isEmail, safeNext, validatePassword, type FormState } from "@/lib/forms";
import { allowed, notExceeded, requestIp, TOO_MANY } from "@/lib/rate-limit";

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const email = field(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  // Every attempt counts per IP. Per account, only failures count, and per
  // account+IP, so someone else failing can't lock you out from your own
  // network; the high per-account cap only stops large distributed guessing.
  const ip = await requestIp();
  const failures = [
    { key: ["login-fail", email, ip], max: 10, per: 900 },
    { key: ["login-fail-account", email], max: 100, per: 3600 },
  ];
  if (!(await allowed({ key: ["login-ip", ip], max: 30, per: 600 })) || !(await notExceeded(...failures))) {
    return { error: TOO_MANY };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    await allowed(...failures);
    return { error: "That email and password don't match." };
  }

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
  if (!(await allowed({ key: ["setup", await requestIp()], max: 5, per: 3600 }))) return { error: TOO_MANY };
  // Optional: a token from the deployment so a freshly deployed, unclaimed
  // instance can't be claimed by whoever finds it first.
  const setupToken = process.env.SETUP_TOKEN;
  if (setupToken && !safeEqual(field(formData, "setup_token"), setupToken)) {
    return { fieldErrors: { setup_token: "That setup token isn't right. It's the SETUP_TOKEN value from your deployment." } };
  }

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
  if (!(await allowed({ key: ["reset-ip", await requestIp()], max: 5, per: 900 }))) return { error: TOO_MANY };

  if (!isEmailConfigured()) {
    return {
      error: "Email isn't set up on this server yet. Ask an admin of your workspace for a reset link.",
    };
  }

  // One address gets at most 3 reset emails an hour; the reply stays the same.
  const url = (await allowed({ key: ["reset-email", email], max: 3, per: 3600 })) ? await createPasswordResetLink(email) : null;
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
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  // Without the current password, this only works in a session that was just
  // opened by a recovery link. Signed-in users change passwords in Settings,
  // which asks for the current one.
  if (!(await openedByRecoveryLink(supabase))) {
    return { error: "This link has expired. Request a new reset link, or change your password in Settings." };
  }
  if (!(await allowed({ key: ["set-password", auth.user.id], max: 5, per: 900 }))) return { error: TOO_MANY };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  // Sign out every other session (a reset usually means the old password leaked).
  await supabase.auth.signOut({ scope: "others" });

  redirect("/");
}

// The current session came from a one-time email link in the last 15 minutes.
async function openedByRecoveryLink(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.auth.getClaims();
  const amr = (data?.claims?.amr ?? []) as { method?: string; timestamp?: number }[];
  const now = Date.now() / 1000;
  return amr.some((a) => (a.method === "recovery" || a.method === "otp") && typeof a.timestamp === "number" && now - a.timestamp < 15 * 60);
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
