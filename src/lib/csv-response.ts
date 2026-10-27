import "server-only";
import { getContext, isAdminRole } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

// Exports are admin-only (see docs/roles.md). Returns the context, or a
// ready-made error response.
export async function requireExportAccess() {
  const ctx = await getContext();
  if (!ctx?.org?.setup_completed_at) return { error: new Response("Not signed in", { status: 401 }) } as const;
  if (!isAdminRole(ctx.role)) return { error: new Response("Only admins can export", { status: 403 }) } as const;
  return { ctx: { ...ctx, org: ctx.org } } as const;
}

export function csvResponse(name: string, header: string[], rows: unknown[][]) {
  const date = new Date().toISOString().slice(0, 10);
  return new Response(toCsv(header, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

export const EXPORT_LIMIT = 50_000;
