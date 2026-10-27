import { Suspense } from "react";
import { PageSpinner } from "@/components/page-spinner";
import { redirect } from "next/navigation";
import { getContext, homePath } from "@/lib/auth";

async function OnboardingIndexContent(): Promise<null> {
  redirect(await homePath(await getContext()));
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function OnboardingIndex() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <OnboardingIndexContent />
    </Suspense>
  );
}
