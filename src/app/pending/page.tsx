import { Suspense } from "react";
import { PageSpinner } from "@/components/page-spinner";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { SignOutButton } from "@/components/sign-out-button";
import { homePath, requireContext } from "@/lib/auth";

export const metadata: Metadata = { title: "Almost ready" };

// Members who accept an invite before an admin has finished the wizard.
async function PendingPageContent() {
  const ctx = await requireContext();
  const home = await homePath(ctx);
  if (home !== "/pending") redirect(home);

  return (
    <AuthShell
      title={`${ctx.org?.name ?? "Your workspace"} is being set up`}
      description="An admin is still finishing setup. Check back in a little while — you'll go straight to the dashboard once it's done."
    >
      <div className="flex justify-center">
        <SignOutButton />
      </div>
    </AuthShell>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function PendingPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <PendingPageContent />
    </Suspense>
  );
}
