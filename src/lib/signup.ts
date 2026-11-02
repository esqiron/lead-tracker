import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { actionEmail, isEmailConfigured, sendEmail } from "@/lib/email";
import { legalInfo, requestLegalInfo } from "@/lib/legal";

// Public sign-up exists only on a hosted instance with its legal pages and
// email set up: people must be able to read what they accept, and prove they
// own their address before the account works. Read per request, from the
// runtime environment. (Legal info only exists in hosted mode.)
export async function signupOpen() {
  return (await requestLegalInfo()) !== null && isEmailConfigured();
}

// The version people accept: the "last updated" date of the legal pages.
export function termsVersion() {
  return legalInfo()?.updated ?? null;
}

// Hosted mode: whether this person accepted the current terms (both parts).
export async function acceptedCurrentTerms(userId: string) {
  const version = termsVersion();
  if (!version) return true;
  const { data } = await createAdminClient()
    .from("profiles")
    .select("terms_version, special_clauses_version")
    .eq("id", userId)
    .maybeSingle();
  return data?.terms_version === version && data.special_clauses_version === version;
}

// Both checkboxes are required, each on its own.
export function consentErrors(formData: FormData) {
  const errors: Record<string, string> = {};
  if (formData.get("accept_terms") !== "on") errors.accept_terms = "Accept the terms to continue.";
  if (formData.get("accept_special_clauses") !== "on") errors.accept_special_clauses = "Accept these clauses to continue.";
  return errors;
}

// Written with the service role: users can't set or change it themselves.
export async function recordAcceptance(userId: string, version: string) {
  const now = new Date().toISOString();
  const { error } = await createAdminClient()
    .from("profiles")
    .update({ terms_accepted_at: now, terms_version: version, special_clauses_accepted_at: now, special_clauses_version: version })
    .eq("id", userId);
  return !error;
}

// Creates an unconfirmed account (or updates one that was never confirmed)
// and emails the confirmation link. For an address that already has an
// account, emails a sign-in reminder instead, so the form's answer never
// tells anyone whether an address is registered.
export async function startSignup(input: { email: string; password: string; fullName: string; version: string }) {
  const admin = createAdminClient();
  const { email, password, fullName } = input;

  const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (existing) {
    const { data } = await admin.auth.admin.getUserById(existing.id);
    if (!data.user || data.user.email_confirmed_at) {
      await sendAlreadyRegistered(email);
      return;
    }
    // Never confirmed: the latest sign-up wins, as with Supabase's own
    // sign-up, so someone who registered your address first doesn't keep
    // their password. Only the newest link works.
    const { error } = await admin.auth.admin.updateUserById(existing.id, { password, user_metadata: { full_name: fullName } });
    if (error) throw error;
    await admin.from("profiles").update({ full_name: fullName }).eq("id", existing.id);
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash || !data.user) throw error ?? new Error("No confirmation token");
  // With Supabase's "Confirm email" off, the account would work before anyone
  // proved they own the address. Refuse rather than hand it out.
  if (!existing && data.user.email_confirmed_at) {
    await admin.auth.admin.deleteUser(data.user.id);
    throw new Error("Supabase created the account already confirmed. Turn on Authentication → Sign In / Providers → Email → Confirm email.");
  }
  if (!(await recordAcceptance(data.user.id, input.version))) throw new Error("Couldn't record the terms acceptance");

  const url = new URL("/auth/confirm", env.siteUrl);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", "signup");
  const { html, text } = actionEmail({
    heading: "Confirm your email",
    body: "Thanks for signing up for Lead Tracker. Confirm your email address to finish creating your account and set up your workspace. The link works once and expires in an hour.",
    buttonLabel: "Confirm my email",
    url: url.toString(),
    footer: "If you didn't sign up, ignore this email and no account will be activated.",
  });
  await sendEmail({ to: email, subject: "Confirm your Lead Tracker account", html, text });
}

async function sendAlreadyRegistered(email: string) {
  const { html, text } = actionEmail({
    heading: "You already have an account",
    body: "Someone tried to sign up for Lead Tracker with this email address, but it already has an account. Sign in instead; if you've forgotten your password, you can reset it from the sign-in page.",
    buttonLabel: "Sign in",
    url: new URL("/login", env.siteUrl).toString(),
    footer: "If this wasn't you, you can ignore this email. Nothing has changed.",
  });
  await sendEmail({ to: email, subject: "Your Lead Tracker account", html, text });
}
