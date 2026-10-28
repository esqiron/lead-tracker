import { Suspense } from "react";
import type { Metadata } from "next";
import { BarList, ChartCard, ColumnChart, DataTable, StatTile } from "@/components/charts";
import { PageSpinner } from "@/components/page-spinner";
import { PageHeader } from "@/components/ui";
import { ParamSelect } from "@/components/url-filters";
import { isAdminRole, requireReadyOrg } from "@/lib/auth";
import { getMembers, getSources } from "@/lib/crm";
import { formatMoney } from "@/lib/format";
import { queryString } from "@/lib/list-filters";
import { bucketLabel, getReport, periodLabel, PERIODS, readReportFilters, winRate } from "@/lib/reports";
import { PeriodPicker } from "./period-picker";

export const metadata: Metadata = { title: "Reports" };

const pct = (n: number | null) => (n === null ? "—" : `${Math.round(n * 100)}%`);
const days = (n: number | null) => (n === null ? "—" : `${n} day${n === 1 ? "" : "s"}`);

// "+12% vs previous period"; null when there's nothing to compare against.
function change(current: number, previous: number, upIsGood = true) {
  if (!previous) return current ? { text: "No data in the previous period", good: null } : null;
  const ratio = (current - previous) / previous;
  if (Math.abs(ratio) < 0.005) return { text: "Same as previous period", good: null };
  return { text: `${ratio > 0 ? "+" : "−"}${Math.round(Math.abs(ratio) * 100)}% vs previous period`, good: ratio > 0 === upIsGood };
}

function pointChange(current: number | null, previous: number | null) {
  if (current === null || previous === null) return null;
  const diff = Math.round((current - previous) * 100);
  if (!diff) return { text: "Same as previous period", good: null };
  return { text: `${diff > 0 ? "+" : "−"}${Math.abs(diff)} pts vs previous period`, good: diff > 0 };
}

async function ReportsContent({ searchParams }: PageProps<"/reports">) {
  const ctx = await requireReadyOrg();
  const { org } = ctx;
  const sp = await searchParams;
  const filters = readReportFilters(sp, org.timezone);
  const [report, members, sources] = await Promise.all([getReport(org.id, filters), getMembers(org.id), getSources(org.id)]);
  const money = (n: number) => formatMoney(n, org.currency);
  const canExport = isAdminRole(ctx.role);
  const exportHref = (section: string) =>
    `/reports/export?${queryString({ section, period: filters.period, from: filters.from, to: filters.to, owner: filters.owner, source: filters.source })}`;
  const exportLink = (section: string) =>
    canExport ? (
      <a href={exportHref(section)} download className="rounded-md px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800">
        CSV
      </a>
    ) : null;

  const k = report.kpis;
  const p = report.previous;
  const rate = winRate(k.won_count, k.lost_count);
  const prevRate = winRate(p.won_count, p.lost_count);
  const avgDeal = k.won_count ? k.won_value / k.won_count : null;
  const prevAvgDeal = p.won_count ? p.won_value / p.won_count : null;
  // Expected revenue per day from the open pipeline at the current pace.
  const velocity = rate !== null && avgDeal !== null && k.avg_days_to_close ? (k.open_count * rate * avgDeal) / Math.max(k.avg_days_to_close, 1) : null;

  const labels = report.timeline.map((t) => bucketLabel(t.bucket, report.bucket));
  const per = report.bucket === "day" ? "day" : report.bucket === "week" ? "week" : "month";
  const created = k.new_leads;

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description={periodLabel(filters)} />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <PeriodPicker periods={PERIODS} from={filters.from} to={filters.to} />
        <ParamSelect
          name="owner"
          label="Owner"
          allLabel="Everyone"
          options={members.map((m) => ({ value: m.id, label: m.name }))}
        />
        <ParamSelect name="source" label="Source" allLabel="All sources" options={sources.map((s) => ({ value: s.id, label: s.name }))} />
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Key numbers">
        <StatTile label="New leads" value={k.new_leads.toLocaleString("en")} delta={change(k.new_leads, p.new_leads)} />
        <StatTile label="Won" value={money(k.won_value)} delta={change(k.won_value, p.won_value)} note={`${k.won_count} won`} />
        <StatTile label="Win rate" value={pct(rate)} delta={pointChange(rate, prevRate)} note={`${k.won_count} won · ${k.lost_count} lost`} />
        <StatTile label="Average deal" value={avgDeal === null ? "—" : money(avgDeal)} delta={avgDeal !== null && prevAvgDeal !== null ? change(avgDeal, prevAvgDeal) : null} />
        <StatTile label="Open pipeline (now)" value={money(k.open_value)} note={`${k.open_count} open lead${k.open_count === 1 ? "" : "s"}`} />
        <StatTile label="Weighted pipeline (now)" value={money(k.weighted_value)} note="Value × stage win chance" />
        <StatTile
          label="Time to close"
          value={days(k.avg_days_to_close)}
          delta={k.avg_days_to_close !== null && p.avg_days_to_close ? change(k.avg_days_to_close, p.avg_days_to_close, false) : null}
          note="Average for leads won"
        />
        <StatTile label="Sales velocity" value={velocity === null ? "—" : `${money(velocity)}/day`} note="Open leads × win rate × avg deal ÷ days to close" />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Won value"
          description={`Per ${per}, by close date`}
          actions={exportLink("timeline")}
          table={
            <DataTable
              head={["Period", "Won value", "Won", "Lost", "New leads"]}
              rows={report.timeline.map((t, i) => [labels[i]!, money(t.won_value), t.won_count, t.lost_count, t.new_leads])}
            />
          }
        >
          <ColumnChart labels={labels} series={[{ key: "won_value", label: "Won value", color: "accent", values: report.timeline.map((t) => Number(t.won_value)) }]} valueFormat={{ kind: "money", currency: org.currency }} />
        </ChartCard>

        <ChartCard
          title="Won and lost"
          description={`Leads closed per ${per}`}
          actions={exportLink("timeline")}
          table={<DataTable head={["Period", "Won", "Lost"]} rows={report.timeline.map((t, i) => [labels[i]!, t.won_count, t.lost_count])} />}
        >
          <ColumnChart
            labels={labels}
            series={[
              { key: "won", label: "Won", color: "accent", values: report.timeline.map((t) => t.won_count) },
              { key: "lost", label: "Lost", color: "muted", values: report.timeline.map((t) => t.lost_count) },
            ]}
          />
        </ChartCard>

        <ChartCard
          title="New leads"
          description={`Created per ${per}`}
          actions={exportLink("timeline")}
          table={<DataTable head={["Period", "New leads"]} rows={report.timeline.map((t, i) => [labels[i]!, t.new_leads])} />}
        >
          <ColumnChart labels={labels} series={[{ key: "new", label: "New leads", color: "accent", values: report.timeline.map((t) => t.new_leads) }]} />
        </ChartCard>

        <ChartCard
          title="Conversion funnel"
          description="How far the leads created in this period got"
          actions={exportLink("funnel")}
          table={
            <DataTable
              head={["Step", "Leads", "Of created", "From previous step"]}
              rows={[
                ["Created", created, created ? "100%" : "—", "—"],
                ...report.funnel.map((f, i) => {
                  const prev = i === 0 ? created : report.funnel[i - 1]!.reached;
                  return [f.name, f.reached, created ? pct(f.reached / created) : "—", prev ? pct(f.reached / prev) : "—"];
                }),
              ]}
            />
          }
        >
          <BarList
            empty="No leads were created in this period."
            rows={
              created
                ? [
                    { key: "created", label: "Created", value: created, display: String(created) },
                    ...report.funnel.map((f, i) => {
                      const prev = i === 0 ? created : report.funnel[i - 1]!.reached;
                      return {
                        key: f.stage_id,
                        label: f.name,
                        value: f.reached,
                        display: `${f.reached} · ${pct(f.reached / created)}`,
                        detail: prev ? `${pct(f.reached / prev)} of the previous step` : undefined,
                      };
                    }),
                  ]
                : []
            }
          />
        </ChartCard>

        <ChartCard
          title="Open pipeline by stage"
          description="Right now, regardless of period"
          actions={exportLink("stages")}
          table={<DataTable head={["Stage", "Leads", "Value", "Win chance"]} rows={report.stages.map((s) => [s.name, s.count, money(s.value), `${s.probability}%`])} />}
        >
          <BarList
            empty="No open leads."
            rows={report.stages.some((s) => s.count) ? report.stages.map((s) => ({ key: s.stage_id, label: s.name, value: Number(s.value), display: money(s.value), detail: `${s.count} lead${s.count === 1 ? "" : "s"} · ${s.probability}% win chance` })) : []}
          />
        </ChartCard>

        <ChartCard
          title="Days in each stage"
          description="Average time before leads moved on, for moves in this period"
          actions={exportLink("velocity")}
          table={<DataTable head={["Stage", "Average days", "Moves"]} rows={report.velocity.map((v) => [v.name, v.avg_days ?? "—", v.stays])} />}
        >
          <BarList
            empty="No leads moved between stages in this period."
            rows={report.velocity
              .filter((v) => v.avg_days !== null)
              .map((v) => ({ key: v.stage_id, label: v.name, value: Number(v.avg_days), display: days(Number(v.avg_days)), detail: `Based on ${v.stays} move${v.stays === 1 ? "" : "s"}` }))}
          />
        </ChartCard>

        <ChartCard
          title="Lost reasons"
          description="Leads lost in this period"
          actions={exportLink("lost_reasons")}
          table={<DataTable head={["Reason", "Leads", "Value"]} rows={report.lost_reasons.map((r) => [r.reason, r.count, money(r.value)])} />}
        >
          <BarList
            empty="No leads were lost in this period."
            rows={report.lost_reasons.map((r) => ({ key: r.reason, label: r.reason, value: r.count, display: String(r.count), detail: `${money(r.value)} in value` }))}
          />
        </ChartCard>

        <ChartCard
          title="Sources"
          description="Leads created in this period, by where they came from"
          actions={exportLink("sources")}
          table={
            <DataTable
              head={["Source", "Leads", "Won", "Lost", "Win rate", "Won value", "Open value"]}
              rows={report.sources.map((s) => [s.name, s.leads, s.won, s.lost, pct(winRate(s.won, s.lost)), money(s.won_value), money(s.open_value)])}
            />
          }
        >
          <BarList
            empty="No leads were created in this period."
            rows={report.sources.map((s) => ({
              key: s.source_id ?? "none",
              label: s.name,
              value: s.leads,
              display: String(s.leads),
              detail: `Win rate ${pct(winRate(s.won, s.lost))} · ${money(s.won_value)} won`,
            }))}
          />
        </ChartCard>
      </div>

      <ChartCard title="Team" description="Per person, for this period (open pipeline is right now)" actions={exportLink("leaderboard")}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800">
              <tr>
                <th scope="col" className="py-2 pr-3 font-medium">Person</th>
                <th scope="col" className="w-1/3 py-2 pr-3 font-medium">Won value</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">Won</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">Win rate</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">New leads</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">Activities</th>
                <th scope="col" className="py-2 text-right font-medium">Open pipeline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 tabular-nums dark:divide-zinc-900">
              {report.leaderboard.map((r) => {
                const maxWon = Math.max(1, ...report.leaderboard.map((x) => Number(x.won_value)));
                return (
                  <tr key={r.user_id}>
                    <td className="py-2 pr-3 text-zinc-900 dark:text-zinc-100">{r.name}</td>
                    <td className="py-2 pr-3">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 rounded-r-[4px]" style={{ width: `${(Number(r.won_value) / maxWon) * 70}%`, background: "var(--viz-accent)" }} />
                        <span className="text-zinc-900 dark:text-zinc-100">{money(r.won_value)}</span>
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right text-zinc-600 dark:text-zinc-400">{r.won}</td>
                    <td className="py-2 pr-3 text-right text-zinc-600 dark:text-zinc-400">{pct(winRate(r.won, r.lost))}</td>
                    <td className="py-2 pr-3 text-right text-zinc-600 dark:text-zinc-400">{r.new_leads}</td>
                    <td className="py-2 pr-3 text-right text-zinc-600 dark:text-zinc-400">{r.activities}</td>
                    <td className="py-2 text-right text-zinc-600 dark:text-zinc-400">{money(r.open_value)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function ReportsPage(props: PageProps<"/reports">) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ReportsContent {...props} />
    </Suspense>
  );
}
