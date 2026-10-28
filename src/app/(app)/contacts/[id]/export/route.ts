import { getContext, isAdminRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Everything held about one contact, as JSON (GDPR right of access and
// portability). Admins only; export_contact_data() checks the role again and
// logs the export in the audit log.
export async function GET(_: Request, { params }: RouteContext<"/contacts/[id]/export">) {
  const ctx = await getContext();
  if (!ctx?.org) return new Response("Not signed in", { status: 401 });
  if (!isAdminRole(ctx.role)) return new Response("Only admins can export a contact's data", { status: 403 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("export_contact_data", { p_contact: id });
  if (error || !data) {
    if (error?.code === "42501") return new Response("Not found", { status: 404 });
    console.error("Contact export failed", error);
    return new Response("The export failed.", { status: 500 });
  }

  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="contact-${id.slice(0, 8)}-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
