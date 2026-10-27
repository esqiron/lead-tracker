import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageSpinner } from "@/components/page-spinner";
import { PageHeader } from "@/components/ui";
import { canEditRole, requireReadyOrg } from "@/lib/auth";
import { getCompanyNames, getContactOptions, getMembers, getSources, getStages } from "@/lib/crm";
import { createClient } from "@/lib/supabase/server";
import { saveLead } from "../../actions";
import { LeadForm } from "../../lead-form";

export const metadata: Metadata = { title: "Edit lead" };

async function EditLeadContent({ params }: PageProps<"/leads/[id]/edit">) {
  const ctx = await requireReadyOrg();
  const { id } = await params;
  if (!canEditRole(ctx.role)) redirect(`/leads/${id}`);
  const { org } = ctx;

  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("leads")
    .select("id, title, value, stage_id, source_id, owner_id, contact_id, expected_close_date, lost_reason, company:companies!leads_org_id_company_id_fkey(name)")
    .eq("id", id)
    .eq("org_id", org.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!lead) notFound();

  const [stages, sources, members, contacts, companies] = await Promise.all([
    getStages(org.id),
    getSources(org.id),
    getMembers(org.id),
    getContactOptions(org.id),
    getCompanyNames(org.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader title="Edit lead" description={lead.title} />
      <LeadForm
        action={saveLead.bind(null, lead.id)}
        initial={{
          title: lead.title,
          contact_id: lead.contact_id ?? "",
          company: lead.company?.name ?? "",
          value: Number(lead.value) ? String(Number(lead.value)) : "",
          stage_id: lead.stage_id,
          source_id: lead.source_id ?? "",
          owner_id: lead.owner_id ?? "",
          expected_close_date: lead.expected_close_date ?? "",
          lost_reason: lead.lost_reason ?? "",
        }}
        stages={stages}
        sources={sources}
        members={members}
        contacts={contacts}
        companies={companies}
        currency={org.currency}
        submitLabel="Save changes"
        cancelHref={`/leads/${lead.id}`}
      />
    </div>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function EditLeadPage(props: PageProps<"/leads/[id]/edit">) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <EditLeadContent {...props} />
    </Suspense>
  );
}
