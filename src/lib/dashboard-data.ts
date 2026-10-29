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

export type ForecastData = {
  start: string;
  end: string;
  days: number;
  // Index of today in the quarter (the last day for a past quarter).
  today: number;
  live: boolean;
  actual: number[];
  projection: number[];
  low: number[];
  high: number[];
  previous: number[];
  won: number;
  forecast: number;
  goal: number | null;
  open_count: number;
  assumed_count: number;
  owners: { user_id: string; name: string; won: number; forecast: number; goal: number | null }[];
};

// This quarter, whatever the dashboard period; owner and source filters still apply.
export const forecastFor = cache(async (orgId: string, owner?: string, source?: string): Promise<ForecastData> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("report_forecast", { p_org: orgId, p_owner: owner, p_source: source });
  if (error) throw new Error(error.message);
  return data as unknown as ForecastData;
});

export type WidgetContext = { orgId: string; currency: string; timezone: string; filters: ReportFilters; compare: boolean; canExport: boolean; isAdmin: boolean };

// --- Pipeline health -----------------------------------------------------------------

// Open deals per stage, by days in that stage: 0–7, 8–14, 15–30, 31–60, 61+.
export type AgingRow = { stage_id: string; name: string; probability: number; counts: number[]; values: number[] };

export const agingFor = cache(async (orgId: string, owner?: string, source?: string): Promise<AgingRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("report_aging", { p_org: orgId, p_owner: owner, p_source: source });
  if (error) throw new Error(error.message);
  return data as unknown as AgingRow[];
});

export const activityDaysFor = cache(async (orgId: string, from: string, to: string, owner?: string): Promise<{ day: string; count: number }[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("report_activity_days", { p_org: orgId, p_from: from, p_to: to, p_owner: owner });
  if (error) throw new Error(error.message);
  return data as unknown as { day: string; count: number }[];
});

// Buckets: < 1 h, 1–4 h, 4–24 h, 1–3 days, 3+ days.
export type FirstReply = { leads: number; replied: number; waiting: number; median_hours: number | null; within_4h: number; buckets: number[] };

export const firstReplyFor = cache(async (orgId: string, from: string, to: string, owner?: string, source?: string): Promise<FirstReply> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("report_first_reply", { p_org: orgId, p_from: from, p_to: to, p_owner: owner, p_source: source });
  if (error) throw new Error(error.message);
  return data as unknown as FirstReply;
});

export type RiskFlag = "overdue" | "quiet" | "unowned";
export type RiskDeal = {
  id: string;
  title: string;
  value: number;
  company: string | null;
  owner: string | null;
  stage: string | null;
  closeDate: string | null;
  daysQuiet: number | null;
  folder: string | null;
  flags: RiskFlag[];
};

// Open deals that need a look, using the Inbox's own rules (lead_threads):
// close date passed, gone quiet (the "Going cold" folder), or nobody owns it.
export const riskFor = cache(async (orgId: string, owner?: string, source?: string): Promise<RiskDeal[]> => {
  const supabase = await createClient();
  let query = supabase
    .from("lead_threads")
    .select("id, title, value, owner_id, stage_id, expected_close_date, days_quiet, folder, reason, today, company:companies!leads_org_id_company_id_fkey(name)")
    .eq("org_id", orgId)
    .eq("status", "open")
    .or("reason.eq.quiet,owner_id.is.null,expected_close_date.lt.today")
    .order("value", { ascending: false })
    .limit(500);
  if (owner) query = query.eq("owner_id", owner);
  if (source) query = query.eq("source_id", source);
  const [{ data, error }, { data: stages }, { data: people }] = await Promise.all([
    query,
    supabase.from("pipeline_stages").select("id, name").eq("org_id", orgId),
    supabase.from("memberships").select("user_id, profiles!memberships_user_id_fkey(full_name, email)").eq("org_id", orgId),
  ]);
  if (error) throw new Error(error.message);
  const stageName = new Map((stages ?? []).map((s) => [s.id, s.name]));
  const personName = new Map((people ?? []).map((p) => [p.user_id, p.profiles?.full_name || p.profiles?.email || null]));
  return data
    .map((t): RiskDeal => {
      const flags: RiskFlag[] = [];
      if (t.expected_close_date && t.today && t.expected_close_date < t.today) flags.push("overdue");
      if (t.reason === "quiet") flags.push("quiet");
      if (!t.owner_id) flags.push("unowned");
      return {
        id: t.id!,
        title: t.title ?? "",
        value: Number(t.value ?? 0),
        company: t.company?.name ?? null,
        owner: t.owner_id ? (personName.get(t.owner_id) ?? null) : null,
        stage: t.stage_id ? (stageName.get(t.stage_id) ?? null) : null,
        closeDate: t.expected_close_date,
        daysQuiet: t.days_quiet,
        folder: t.folder,
        flags,
      };
    })
    .filter((d) => d.flags.length);
});
