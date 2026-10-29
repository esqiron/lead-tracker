import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageSpinner } from "@/components/page-spinner";
import { requireReadyOrg } from "@/lib/auth";
import { listDashboards } from "@/lib/dashboard-data";

export const metadata: Metadata = { title: "Reports" };

// Reports opens the first dashboard the user can see, keeping any filters in
// the link (older /reports?period=… links still work).
async function OpenFirstDashboard({ searchParams }: PageProps<"/reports">) {
  const { org } = await requireReadyOrg();
  const [dashboards, sp] = await Promise.all([listDashboards(org.id), searchParams]);
  const query = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
  return redirect(`/reports/${dashboards[0]!.id}${query.size ? `?${query}` : ""}`);
}

export default function ReportsPage(props: PageProps<"/reports">) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <OpenFirstDashboard {...props} />
    </Suspense>
  );
}
