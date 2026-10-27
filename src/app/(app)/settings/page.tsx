import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PageSpinner } from "@/components/page-spinner";
import { isAdminRole, requireReadyOrg } from "@/lib/auth";

async function SettingsIndexContent(): Promise<null> {
  const ctx = await requireReadyOrg();
  redirect(isAdminRole(ctx.role) ? "/settings/general" : "/settings/profile");
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function SettingsIndex() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <SettingsIndexContent />
    </Suspense>
  );
}
