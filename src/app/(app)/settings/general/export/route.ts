import { getContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Everything the organization holds, as JSON (GDPR data portability). Owner
// only; export_org_data() checks the role again, leaves secrets out and logs
// the export in the audit log.
export async function GET() {
  const ctx = await getContext();
  if (!ctx?.org) return new Response("Not signed in", { status: 401 });
  if (ctx.role !== "owner") return new Response("Only the owner can export all data", { status: 403 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("export_org_data", { p_org: ctx.org.id });
  if (error || !data) {
    console.error("Org export failed", error);
    return new Response("The export failed.", { status: 500 });
  }

  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="lead-tracker-export-${ctx.org.slug}-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
