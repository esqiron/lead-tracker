import type { NextRequest } from "next/server";
import { csvResponse, requireExportAccess } from "@/lib/csv-response";
import { bucketLabel, getReport, readReportFilters, winRate } from "@/lib/reports";
import { logEvent } from "@/lib/audit";

// CSV for one report section, with the same period and filters as the page.
export async function GET(request: NextRequest) {
  const access = await requireExportAccess();
  if ("error" in access) return access.error;
  const { org, user } = access.ctx;

  const sp = Object.fromEntries(request.nextUrl.searchParams);
  const filters = readReportFilters(sp, org.timezone);
  const report = await getReport(org.id, filters);
  await logEvent({ orgId: org.id, actorId: user.id, action: "export", entity: "report", details: { section: sp.section, from: filters.from, to: filters.to } });
  const name = (section: string) => `report-${section}-${filters.from}-to-${filters.to}`;
  const rate = (won: number, lost: number) => {
    const r = winRate(won, lost);
    return r === null ? "" : Math.round(r * 1000) / 10;
  };

  switch (sp.section) {
    case "timeline":
      return csvResponse(
        name("over-time"),
        ["Period start", "Label", "New leads", "Won", "Won value", "Lost"],
        report.timeline.map((t) => [t.bucket, bucketLabel(t.bucket, report.bucket), t.new_leads, t.won_count, t.won_value, t.lost_count]),
      );
    case "funnel": {
      const created = report.kpis.new_leads;
      return csvResponse(
        name("funnel"),
        ["Step", "Leads", "Percent of created"],
        [["Created", created, created ? 100 : ""], ...report.funnel.map((f) => [f.name, f.reached, created ? Math.round((f.reached / created) * 1000) / 10 : ""])],
      );
    }
    case "stages":
      return csvResponse(name("open-pipeline"), ["Stage", "Open leads", "Value", "Win chance %"], report.stages.map((s) => [s.name, s.count, s.value, s.probability]));
    case "velocity":
      return csvResponse(name("days-in-stage"), ["Stage", "Average days", "Moves"], report.velocity.map((v) => [v.name, v.avg_days ?? "", v.stays]));
    case "lost_reasons":
      return csvResponse(name("lost-reasons"), ["Reason", "Leads", "Value"], report.lost_reasons.map((r) => [r.reason, r.count, r.value]));
    case "sources":
      return csvResponse(
        name("sources"),
        ["Source", "Leads", "Won", "Lost", "Win rate %", "Won value", "Open value"],
        report.sources.map((s) => [s.name, s.leads, s.won, s.lost, rate(s.won, s.lost), s.won_value, s.open_value]),
      );
    case "leaderboard":
      return csvResponse(
        name("team"),
        ["Person", "New leads", "Won", "Lost", "Win rate %", "Won value", "Open pipeline", "Activities"],
        report.leaderboard.map((r) => [r.name, r.new_leads, r.won, r.lost, rate(r.won, r.lost), r.won_value, r.open_value, r.activities]),
      );
    default:
      return new Response("Unknown report section", { status: 400 });
  }
}
