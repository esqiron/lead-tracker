import { Suspense } from "react";
import { PageSpinner } from "@/components/page-spinner";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { requireContext } from "@/lib/auth";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

// Reached through the emailed recovery link, which signs the user in first.
async function ResetPasswordPageContent() {
  const ctx = await requireContext();

  return (
    <AuthShell title="Choose a new password" description={<>For {ctx.user.email}</>}>
      <ResetPasswordForm />
    </AuthShell>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}
