import { Suspense } from "react";
import { PageSpinner } from "@/components/page-spinner";
import { redirect } from "next/navigation";
import { getContext, homePath } from "@/lib/auth";

// Entry point: sends everyone to the right place for their setup state.
async function HomeContent(): Promise<null> {
  redirect(await homePath(await getContext()));
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function Home() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <HomeContent />
    </Suspense>
  );
}
