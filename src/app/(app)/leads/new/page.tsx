import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageSpinner } from "@/components/page-spinner";
import { PageHeader } from "@/components/ui";
import { canEditRole, requireReadyOrg } from "@/lib/auth";
import { getCompanyNames, getContactOptions, getMembers, getSources, getStages } from "@/lib/crm";
import { param } from "@/lib/forms";
import { saveLead } from "../actions";
import { LeadForm } from "../lead-form";

export const metadata: Metadata = { title: "New lead" };

async function NewLeadContent({ searchParams }: PageProps<"/leads/new">) {
  const ctx = await requireReadyOrg();
  if (!canEditRole(ctx.role)) redirect("/leads");
  const { org } = ctx;
  const sp = await searchParams;

  const [stages, sources, members, contacts, companies] = await Promise.all([
    getStages(org.id),
    getSources(org.id),
    getMembers(org.id),
    getContactOptions(org.id),
    getCompanyNames(org.id),
  ]);
  const preselected = param(sp.contact);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader title="New lead" />
      <LeadForm
        action={saveLead.bind(null, null)}
        initial={{
          title: "",
          contact_id: preselected && contacts.some((c) => c.id === preselected) ? preselected : "",
          company: "",
          value: "",
          stage_id: stages.find((s) => !s.is_won && !s.is_lost)?.id ?? "",
          source_id: "",
          owner_id: ctx.user.id,
          expected_close_date: "",
          lost_reason: "",
        }}
        stages={stages}
        sources={sources}
        members={members}
        contacts={contacts}
        companies={companies}
        currency={org.currency}
        submitLabel="Create lead"
        cancelHref={preselected ? `/contacts/${preselected}` : "/leads"}
      />
    </div>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function NewLeadPage(props: PageProps<"/leads/new">) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <NewLeadContent {...props} />
    </Suspense>
  );
}
