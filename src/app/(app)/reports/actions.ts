"use server";

import { refresh } from "next/cache";
import { canEditRole, requireReadyOrg } from "@/lib/auth";
import { DRILL_KINDS, filtersSchema, isTemplateKey, layoutSchema, TEMPLATES, type DashboardFilters, type DrillRequest, type Widget } from "@/lib/dashboards";
import { userMessage } from "@/lib/errors";
import { personName } from "@/lib/format";
import { FOLDERS } from "@/lib/inbox";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

type Result = { id?: string; error?: string };

const isUuid = (value: string) => /^[0-9a-f-]{36}$/.test(value);
const nameSchema = z.string().trim().min(1, "Give the dashboard a name.").max(80, "Keep the name under 80 characters.");

// Every widget gets a fresh id when copied, so two dashboards never share one.
const freshIds = (layout: Widget[]) => layout.map((w) => ({ ...w, id: crypto.randomUUID().slice(0, 8) }));

async function insert(fields: { name: string; visibility: "private" | "org"; filters: DashboardFilters; layout: Widget[]; template: string | null }): Promise<Result> {
  const { org, role } = await requireReadyOrg();
  // Viewers can keep private dashboards but can't share them.
  const visibility = fields.visibility === "org" && canEditRole(role) ? "org" : "private";
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dashboards")
    .insert({ org_id: org.id, name: fields.name, visibility, filters: fields.filters, layout: fields.layout, template: fields.template })
    .select("id")
    .single();
  if (error) return { error: userMessage(error) };
  return { id: data.id };
}

// Editing a built-in dashboard saves a shared copy the team then uses instead.
export async function saveTemplateCopy(template: string): Promise<Result> {
  if (!isTemplateKey(template)) return { error: "That dashboard no longer exists." };
  const t = TEMPLATES[template];
  return insert({ name: t.name, visibility: "org", filters: t.filters, layout: freshIds(t.layout), template });
}

// "New dashboard": blank, or a private copy of a template.
export async function createDashboard(input: { template?: string }): Promise<Result> {
  if (input.template && isTemplateKey(input.template)) {
    const t = TEMPLATES[input.template];
    return insert({ name: t.name, visibility: "private", filters: t.filters, layout: freshIds(t.layout), template: input.template });
  }
  return insert({ name: "Untitled dashboard", visibility: "private", filters: { period: "this_month", compare: true }, layout: [], template: null });
}

export type DashboardPatch = { name?: string; visibility?: "private" | "org"; filters?: DashboardFilters; layout?: Widget[] };

// Autosave from the editor. `rerender` re-renders the page in the same round
// trip, for changes the server has to draw (new widgets, changed options).
export async function saveDashboard(id: string, patch: DashboardPatch, rerender = false): Promise<Result> {
  if (!isUuid(id)) return { error: "That dashboard no longer exists." };
  const update: { name?: string; visibility?: "private" | "org"; filters?: DashboardFilters; layout?: Widget[] } = {};
  if (patch.name !== undefined) {
    const name = nameSchema.safeParse(patch.name);
    if (!name.success) return { error: name.error.issues[0]!.message };
    update.name = name.data;
  }
  if (patch.visibility !== undefined) update.visibility = patch.visibility === "org" ? "org" : "private";
  if (patch.filters !== undefined) {
    const filters = filtersSchema.safeParse(patch.filters);
    if (!filters.success) return { error: "Those filters aren't valid." };
    update.filters = filters.data;
  }
  if (patch.layout !== undefined) {
    const layout = layoutSchema.safeParse(patch.layout);
    if (!layout.success) return { error: "One of the widgets isn't valid. Reload and try again." };
    if (new Set(layout.data.map((w) => w.id)).size !== layout.data.length) return { error: "Two widgets share an id. Reload and try again." };
    update.layout = layout.data;
  }

  const { org } = await requireReadyOrg();
  const supabase = await createClient();
  // RLS decides who may edit; no row back means it wasn't allowed (or is gone).
  const { data, error } = await supabase.from("dashboards").update(update).eq("id", id).eq("org_id", org.id).is("deleted_at", null).select("id");
  if (error) return { error: userMessage(error) };
  if (!data.length) return { error: "You can't edit this dashboard. Duplicate it to make your own." };
  if (rerender) refresh();
  return { id };
}

export async function resetToTemplate(id: string): Promise<Result> {
  if (!isUuid(id)) return { error: "That dashboard no longer exists." };
  const supabase = await createClient();
  const { data } = await supabase.from("dashboards").select("template").eq("id", id).maybeSingle();
  if (!data?.template || !isTemplateKey(data.template)) return { error: "This dashboard didn't start from a template." };
  const t = TEMPLATES[data.template];
  return saveDashboard(id, { filters: t.filters, layout: freshIds(t.layout) }, true);
}

export async function duplicateDashboard(id: string): Promise<Result> {
  if (!isUuid(id) && !isTemplateKey(id)) return { error: "That dashboard no longer exists." };
  if (isTemplateKey(id)) return createDashboard({ template: id });
  const supabase = await createClient();
  const { data } = await supabase.from("dashboards").select("name, filters, layout, template").eq("id", id).maybeSingle();
  if (!data) return { error: "That dashboard no longer exists." };
  const layout = layoutSchema.safeParse(data.layout);
  return insert({
    name: `Copy of ${data.name}`.slice(0, 80),
    visibility: "private",
    filters: filtersSchema.safeParse(data.filters).data ?? {},
    layout: freshIds(layout.success ? layout.data : []),
    template: data.template,
  });
}

// Soft delete, so it can be undone.
export async function deleteDashboard(id: string): Promise<Result> {
  return setDeleted(id, new Date().toISOString());
}

export async function restoreDashboard(id: string): Promise<Result> {
  return setDeleted(id, null);
}

async function setDeleted(id: string, deletedAt: string | null): Promise<Result> {
  if (!isUuid(id)) return { error: "That dashboard no longer exists." };
  const { org } = await requireReadyOrg();
  const supabase = await createClient();
  const { data, error } = await supabase.from("dashboards").update({ deleted_at: deletedAt }).eq("id", id).eq("org_id", org.id).select("id");
  if (error) return { error: userMessage(error) };
  if (!data.length) return { error: "You can't delete this dashboard." };
  return { id };
}

// --- Drill-down ----------------------------------------------------------------------

export type DrillRow = {
  id: string;
  title: string;
  detail: string;
  stage: { name: string; is_won: boolean; is_lost: boolean } | null;
  value: number;
  href: string;
};
export type DrillResult = { rows?: DrillRow[]; count?: number; value?: number; error?: string };

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const drillSchema = z.object({
  from: day,
  to: day,
  owner: z.uuid().optional(),
  source: z.uuid().optional(),
  queries: z
    .array(z.object({ kind: z.enum(DRILL_KINDS), params: z.record(z.string(), z.union([z.string().max(200), z.number(), z.boolean()])).optional() }))
    .min(1)
    .max(12),
});
const SHOWN = 200;

// The leads behind one number, largest first, each linking to its thread.
export async function drillLeads(request: DrillRequest): Promise<DrillResult> {
  const parsed = drillSchema.safeParse(request);
  if (!parsed.success) return { error: "Couldn't open those leads. Reload and try again." };
  const { from, to, owner, source, queries } = parsed.data;
  const { org } = await requireReadyOrg();
  const supabase = await createClient();

  // report_drill takes null for "no filter"; the generated types don't allow it.
  const noFilter = null as unknown as string;
  const results = await Promise.all(
    queries.map((q) =>
      supabase.rpc("report_drill", { p_org: org.id, p_from: from, p_to: to, p_owner: owner ?? noFilter, p_source: source ?? noFilter, p_kind: q.kind, p_params: q.params ?? {} }),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: userMessage(failed.error) };
  const ids = [...new Set(results.flatMap((r) => (r.data as string[] | null) ?? []))];
  if (!ids.length) return { rows: [], count: 0, value: 0 };

  const [{ data: leads, error }, { data: threads }] = await Promise.all([
    supabase
      .from("leads")
      .select(
        `id, title, value, status, created_at, closed_at,
        stage:pipeline_stages!leads_org_id_stage_id_fkey(name, is_won, is_lost),
        company:companies!leads_org_id_company_id_fkey(name),
        source:lead_sources!leads_org_id_source_id_fkey(name),
        owner:profiles!leads_owner_id_fkey(full_name, email)`,
      )
      .in("id", ids.slice(0, 1000))
      .order("value", { ascending: false }),
    supabase.from("lead_threads").select("id, folder").in("id", ids.slice(0, 1000)),
  ]);
  if (error) return { error: userMessage(error) };

  const folderOf = new Map((threads ?? []).map((t) => [t.id, t.folder]));
  const when = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: org.timezone }).format(new Date(iso));
  const rows = leads.map((l): DrillRow => {
    const folder = FOLDERS.find((f) => f.folder === folderOf.get(l.id));
    const closed = l.status !== "open" && l.closed_at;
    return {
      id: l.id,
      title: l.title,
      detail: [
        l.company?.name,
        l.owner ? personName(l.owner) : "Unassigned",
        l.source?.name,
        closed ? `${l.status === "won" ? "won" : "lost"} ${when(l.closed_at!)}` : `created ${when(l.created_at)}`,
      ]
        .filter(Boolean)
        .join(" · "),
      stage: l.stage,
      value: Number(l.value),
      // Open and recently won deals open in their Inbox thread; older closed ones on their lead page.
      href: l.status === "open" || folder ? `/inbox/everyone/${folder?.key ?? "waiting"}/${l.id}` : `/leads/${l.id}`,
    };
  });
  return { rows: rows.slice(0, SHOWN), count: ids.length, value: rows.reduce((sum, r) => sum + r.value, 0) };
}
