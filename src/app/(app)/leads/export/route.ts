import type { NextRequest } from "next/server";
import { csvResponse, EXPORT_LIMIT, requireExportAccess } from "@/lib/csv-response";
import { getStages } from "@/lib/crm";
import { applyLeadFilters, readLeadFilters } from "@/lib/list-filters";
import { createClient } from "@/lib/supabase/server";
import { userMessage } from "@/lib/errors";
import { logEvent } from "@/lib/audit";

// CSV of the leads list, with the same filters as the page.
export async function GET(request: NextRequest) {
  const access = await requireExportAccess();
  if ("error" in access) return access.error;
  const { org, user } = access.ctx;

  const filters = readLeadFilters(Object.fromEntries(request.nextUrl.searchParams));
  const supabase = await createClient();
  const query = applyLeadFilters(
    supabase
      .from("leads")
      .select(
        `id, title, value, currency, status, stage_id, expected_close_date, lost_reason, closed_at, created_at, tags,
        contact:contacts!leads_org_id_contact_id_fkey(first_name, last_name, email, phone),
        company:companies!leads_org_id_company_id_fkey(name),
        source:lead_sources!leads_org_id_source_id_fkey(name),
        owner:profiles!leads_owner_id_fkey(email)`,
      )
      .eq("org_id", org.id)
      .is("deleted_at", null),
    filters,
    user.id,
    { status: true },
  );
  const [{ data, error }, stages] = await Promise.all([query.order("created_at").limit(EXPORT_LIMIT), getStages(org.id)]);
  if (error) return new Response(userMessage(error, "The export failed."), { status: 500 });

  await logEvent({ orgId: org.id, actorId: user.id, action: "export", entity: "leads", details: { rows: data?.length ?? 0, filters } });
  const stageName = new Map(stages.map((s) => [s.id, s.name]));
  return csvResponse(
    "leads",
    [
      "Lead name", "Value", "Currency", "Stage", "Status", "Source", "Owner email", "Expected close date",
      "First name", "Last name", "Email", "Phone", "Company", "Lost reason", "Closed at", "Created at", "Tags", "ID",
    ],
    (data ?? []).map((l) => [
      l.title, l.value, l.currency ?? org.currency, stageName.get(l.stage_id), l.status, l.source?.name, l.owner?.email, l.expected_close_date,
      l.contact?.first_name, l.contact?.last_name, l.contact?.email, l.contact?.phone, l.company?.name, l.lost_reason, l.closed_at, l.created_at, l.tags, l.id,
    ]),
  );
}
