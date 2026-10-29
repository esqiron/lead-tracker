import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isTemplateKey, parseFilters, parseLayout, templateDashboard, type Dashboard } from "@/lib/dashboards";
import { getReport, type ReportFilters } from "@/lib/reports";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function toDashboard(row: { id: string; name: string; visibility: string; filters: unknown; layout: unknown; template: string | null; created_by: string | null }): Dashboard {
  return {
    id: row.id,
    name: row.name,
    visibility: row.visibility === "org" ? "org" : "private",
    filters: parseFilters(row.filters),
    layout: parseLayout(row.layout),
    template: row.template,
    saved: true,
    createdBy: row.created_by,
  };
}

// Dashboards the user can see: shared ones first, then their own. Until the
// team has a shared one, the built-in template stands in for it.
export const listDashboards = cache(async (orgId: string): Promise<Dashboard[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dashboards")
    .select("id, name, visibility, filters, layout, template, created_by")
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .order("visibility", { ascending: true })
    .order("position")
    .order("created_at");
  if (error) throw new Error(error.message);
  const saved = data.map(toDashboard);
  return saved.some((d) => d.visibility === "org") ? saved : [templateDashboard("pipeline-health"), ...saved];
});

export async function getDashboard(orgId: string, id: string): Promise<Dashboard | null> {
  if (isTemplateKey(id)) return templateDashboard(id);
  if (!UUID.test(id)) return null;
  return (await listDashboards(orgId)).find((d) => d.id === id) ?? null;
}

// Widgets on one page share these, so each query runs once per request
// however many widgets read it. Arguments are primitives so cache() can key them.
export const reportFor = cache((orgId: string, from: string, to: string, owner?: string, source?: string) =>
  getReport(orgId, { period: "custom", from, to, owner, source }),
);

type KpiWindow = {
  new_leads: number;
  won_count: number;
  won_value: number;
  lost_count: number;
  activities: number;
  weighted_value: number;
  median_reply_hours: number | null;
};
export type KpiData = { bucket: "day" | "week" | "month"; current: KpiWindow; previous: KpiWindow; series: (KpiWindow & { bucket: string })[] };

export const kpisFor = cache(async (orgId: string, from: string, to: string, owner?: string, source?: string): Promise<KpiData> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("report_kpis", { p_org: orgId, p_from: from, p_to: to, p_owner: owner, p_source: source });
  if (error) throw new Error(error.message);
  return data as unknown as KpiData;
});

export type SplitData = {
  bucket: "day" | "week" | "month";
  buckets: string[];
  // Every possible series in a stable order; position is null for "No source" / "No owner".
  keys: { key: string | null; name: string; position: number | null }[];
  rows: { bucket: string; key: string | null; value: number }[];
};

export const splitFor = cache(
  async (orgId: string, from: string, to: string, owner: string | undefined, source: string | undefined, measure: string, split: string): Promise<SplitData> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("report_timeline_split", {
      p_org: orgId,
      p_from: from,
      p_to: to,
      p_owner: owner,
      p_source: source,
      p_measure: measure,
      p_split: split,
    });
    if (error) throw new Error(error.message);
    return data as unknown as SplitData;
  },
);

export type WidgetContext = { orgId: string; currency: string; filters: ReportFilters; compare: boolean; canExport: boolean };
