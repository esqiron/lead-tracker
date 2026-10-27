import { Suspense } from "react";
import { PageSpinner } from "@/components/page-spinner";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { instanceInitialized } from "@/lib/auth";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Set up" };

async function SetupPageContent() {
  if (await instanceInitialized()) redirect("/login");

  return (
    <AuthShell
      title="Set up Lead Tracker"
      description="Create the owner account first. Next you'll set up your organization and invite your team."
    >
      <SetupForm />
    </AuthShell>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function SetupPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <SetupPageContent />
    </Suspense>
  );
}
