import { Suspense } from "react";
import { PageSpinner } from "@/components/page-spinner";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { SignOutButton } from "@/components/sign-out-button";
import { homePath, requireContext } from "@/lib/auth";

export const metadata: Metadata = { title: "No access" };

// Signed in, but not a member of this server's organization (e.g. removed).
async function NoAccessPageContent() {
  const ctx = await requireContext();
  const home = await homePath(ctx);
  if (home !== "/no-access") redirect(home);

  return (
    <AuthShell
      title="You don't have access yet"
      description={`${ctx.user.email} isn't a member of this workspace. Ask an admin to send you an invitation.`}
    >
      <div className="flex justify-center">
        <SignOutButton />
      </div>
    </AuthShell>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function NoAccessPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <NoAccessPageContent />
    </Suspense>
  );
}
