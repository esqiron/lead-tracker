import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageSpinner } from "@/components/page-spinner";
import { PageHeader } from "@/components/ui";
import { isAdminRole, requireReadyOrg } from "@/lib/auth";
import { getStages } from "@/lib/crm";
import { ImportWizard } from "./import-wizard";

export const metadata: Metadata = { title: "Import contacts" };

async function ImportContent() {
  const ctx = await requireReadyOrg();
  if (!isAdminRole(ctx.role)) redirect("/contacts");
  const stages = await getStages(ctx.org.id);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-4">
        <Link href="/contacts" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          ← People
        </Link>
        <PageHeader
          title="Import from CSV"
          description="Bring in contacts, and optionally a lead for each one. Nothing is imported until you confirm the column mapping."
        />
      </div>
      <ImportWizard stageNames={stages.map((s) => s.name)} />
    </div>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function ImportPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ImportContent />
    </Suspense>
  );
}
