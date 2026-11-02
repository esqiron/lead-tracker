import { Suspense } from "react";
import { PageSpinner } from "@/components/page-spinner";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
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
    <AuthShell title="Create an account" description="Lead Tracker is currently free. After confirming your email, you'll set up your organization.">
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
