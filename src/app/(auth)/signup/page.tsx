import { Suspense } from "react";
import { PageSpinner } from "@/components/page-spinner";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AuthAside, AuthShell } from "@/components/auth-shell";
import { getUser } from "@/lib/auth";
import { signupOpen } from "@/lib/signup";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create an account" };

// Hosted mode only. Self-hosted instances have one owner (from /setup) and
// add everyone else by invite.
async function SignupPageContent() {
  if (!(await signupOpen())) notFound();
  if (await getUser()) redirect("/");

  return (
    <AuthShell
      eyebrow="Create an account"
      title="Start your workspace"
      description="Lead Tracker is currently free. Confirm your email, then set up your organization."
      aside={<AuthAside prompt="Already have an account?" href="/login" label="Sign in" />}
      wide
    >
      <SignupForm />
    </AuthShell>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function SignupPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <SignupPageContent />
    </Suspense>
  );
}
