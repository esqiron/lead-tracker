import "server-only";
import { createClient } from "@/lib/supabase/server";
import { param } from "@/lib/forms";
import { todayIn } from "@/lib/format";

// Shape of public.report() (see supabase/migrations/*_reports.sql).
type Window = { new_leads: number; won_count: number; won_value: number; lost_count: number; avg_days_to_close: number | null };
export type ReportData = {
  bucket: "day" | "week" | "month";
  kpis: Window & { open_count: number; open_value: number; weighted_value: number };
  previous: Window;
  stages: { stage_id: string; name: string; probability: number; count: number; value: number }[];
  funnel: { stage_id: string; name: string; is_won: boolean; reached: number }[];
  sources: { name: string; source_id: string | null; leads: number; won: number; lost: number; won_value: number; open_value: number }[];
  timeline: { bucket: string; new_leads: number; won_count: number; won_value: number; lost_count: number }[];
  lost_reasons: { reason: string; count: number; value: number }[];
  leaderboard: { user_id: string; name: string; new_leads: number; won: number; lost: number; won_value: number; open_value: number; activities: number }[];
  velocity: { stage_id: string; name: string; avg_days: number | null; stays: number }[];
};

export const PERIODS = [
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "last_30", label: "Last 30 days" },
  { value: "last_90", label: "Last 90 days" },
  { value: "this_quarter", label: "This quarter" },
  { value: "this_year", label: "This year" },
  { value: "last_12m", label: "Last 12 months" },
  { value: "custom", label: "Custom range" },
] as const;
export type PeriodKey = (typeof PERIODS)[number]["value"];

export type ReportFilters = { period: PeriodKey; from: string; to: string; owner?: string; source?: string };

const iso = (d: Date) => d.toISOString().slice(0, 10);
const day = (s: string) => new Date(`${s}T00:00:00Z`);
const addDays = (s: string, n: number) => iso(new Date(day(s).getTime() + n * 86_400_000));
const isDay = (s: string | undefined): s is string => Boolean(s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(day(s).getTime()));

// Dates are calendar days in the org's time zone.
export function readReportFilters(sp: Record<string, string | string[] | undefined>, timeZone: string): ReportFilters {
  const today = todayIn(timeZone);
  const [y, m] = today.split("-").map(Number) as [number, number];
  const monthStart = (yy: number, mm: number) => iso(new Date(Date.UTC(yy, mm - 1, 1)));
  const requested = param(sp.period) as PeriodKey | undefined;
  const period: PeriodKey = PERIODS.some((p) => p.value === requested) ? requested! : "this_month";
  const owner = param(sp.owner);
  const source = param(sp.source);
  const uuidOrUndefined = (v?: string) => (v && /^[0-9a-f-]{36}$/.test(v) ? v : undefined);

  let from: string;
  let to = today;
  switch (period) {
    case "last_month":
      from = monthStart(m === 1 ? y - 1 : y, m === 1 ? 12 : m - 1);
      to = addDays(monthStart(y, m), -1);
      break;
    case "last_30":
      from = addDays(today, -29);
      break;
    case "last_90":
      from = addDays(today, -89);
      break;
    case "this_quarter":
      from = monthStart(y, Math.floor((m - 1) / 3) * 3 + 1);
      break;
    case "this_year":
      from = `${y}-01-01`;
      break;
    case "last_12m":
      from = addDays(today, -364);
      break;
    case "custom": {
      const f = param(sp.from);
      const t = param(sp.to);
      from = isDay(f) ? f : monthStart(y, m);
      to = isDay(t) ? t : today;
      if (to < from) [from, to] = [to, from];
      if (day(to).getTime() - day(from).getTime() > 3660 * 86_400_000) from = addDays(to, -3660);
      break;
    }
    default:
      from = monthStart(y, m);
  }
  return { period, from, to, owner: uuidOrUndefined(owner), source: uuidOrUndefined(source) };
}

export async function getReport(orgId: string, f: ReportFilters): Promise<ReportData> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("report", {
    p_org: orgId,
    p_from: f.from,
    p_to: f.to,
    p_owner: f.owner,
    p_source: f.source,
  });
  if (error) throw new Error(error.message);
  return data as unknown as ReportData;
}

export function winRate(won: number, lost: number) {
  return won + lost ? won / (won + lost) : null;
}

// "1 Mar – 31 Mar 2026"
export function periodLabel(f: ReportFilters) {
  const fmt = (s: string, withYear: boolean) =>
    new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC" }).format(day(s));
  return f.from === f.to ? fmt(f.from, true) : `${fmt(f.from, f.from.slice(0, 4) !== f.to.slice(0, 4))} – ${fmt(f.to, true)}`;
}

// Short axis label for a bucket start date.
export function bucketLabel(bucket: string, size: ReportData["bucket"]) {
  const d = day(bucket);
  if (size === "month") return new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }).format(d);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(d);
}
