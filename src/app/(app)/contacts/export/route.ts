import type { NextRequest } from "next/server";
import { csvResponse, EXPORT_LIMIT, requireExportAccess } from "@/lib/csv-response";
import { applyContactFilters, readContactFilters } from "@/lib/list-filters";
import { createClient } from "@/lib/supabase/server";

// CSV of the contacts list, with the same filters as the page. The column
// names match the importer, so an export can be re-imported elsewhere.
export async function GET(request: NextRequest) {
  const access = await requireExportAccess();
  if ("error" in access) return access.error;
  const { org, user } = access.ctx;

  const filters = readContactFilters(Object.fromEntries(request.nextUrl.searchParams));
  const supabase = await createClient();
  const { data, error } = await applyContactFilters(
    supabase
      .from("contacts")
      .select(
        `id, first_name, last_name, email, phone, title, tags, notes, created_at, consented_at, consent_text,
        company:companies!contacts_org_id_company_id_fkey(name),
        owner:profiles!contacts_owner_id_fkey(email)`,
      )
      .eq("org_id", org.id)
      .is("deleted_at", null),
    filters,
    user.id,
  )
    .order("created_at")
    .limit(EXPORT_LIMIT);
  if (error) return new Response(error.message, { status: 500 });

  return csvResponse(
    "contacts",
    ["First name", "Last name", "Email", "Phone", "Job title", "Company", "Tags", "Notes", "Owner email", "Consented at", "Consent text", "Created at", "ID"],
    (data ?? []).map((c) => [
      c.first_name, c.last_name, c.email, c.phone, c.title, c.company?.name, c.tags, c.notes, c.owner?.email, c.consented_at, c.consent_text, c.created_at, c.id,
    ]),
  );
}
