import type { ReactNode } from "react";
import { BarList, ChartCard, DataTable, LineChart, type Series, type SeriesColor } from "@/components/charts";
import { kpisFor, reportFor, splitFor, type WidgetContext } from "@/lib/dashboard-data";
import { widgetTitle, type DrillQuery, type DrillRequest, type KpiMetric, type Widget, type WidgetOf } from "@/lib/dashboards";
import { formatMoney } from "@/lib/format";
import { queryString } from "@/lib/list-filters";
import { bucketLabel, periodLabel, winRate } from "@/lib/reports";
import { DrillBarList, DrillButton, DrillColumnChart, DrillStatTile } from "./drill";

// One server component per widget type. Each reads only what it shows; the
// shared queries are deduplicated per request (see lib/dashboard-data.ts).

const pct = (n: number | null) => (n === null ? "—" : `${Math.round(n * 100)}%`);
const days = (n: number | null) => (n === null ? "—" : `${n} day${n === 1 ? "" : "s"}`);
const hours = (n: number | null) => (n === null ? "—" : n < 1 ? `${Math.round(n * 60)} min` : `${n} h`);

const VS_PREVIOUS = { vs: "vs previous period", none: "Nothing in the previous period", same: "Same as previous period" };
// For snapshots (pipeline now vs when the period started).
const VS_START = { vs: "since the period started", none: "Nothing open when the period started", same: "Same as when the period started" };

// "+12% vs previous period"; null when there's nothing to compare against.
function change(current: number, previous: number, upIsGood = true, words = VS_PREVIOUS) {
  if (!previous) return current ? { text: words.none, good: null } : null;
  const ratio = (current - previous) / previous;
  if (Math.abs(ratio) < 0.005) return { text: words.same, good: null };
  return { text: `${ratio > 0 ? "+" : "−"}${Math.round(Math.abs(ratio) * 100)}% ${words.vs}`, good: ratio > 0 === upIsGood };
}

function pointChange(current: number | null, previous: number | null) {
  if (current === null || previous === null) return null;
  const diff = Math.round((current - previous) * 100);
  if (!diff) return { text: "Same as previous period", good: null };
  return { text: `${diff > 0 ? "+" : "−"}${Math.abs(diff)} pts vs previous period`, good: diff > 0 };
}

// Sparklines skip empty buckets by carrying the last known value forward.
const carry = (values: (number | null)[]) => {
  let last = 0;
  return values.map((v) => (v === null ? last : (last = v)));
};

const args = (ctx: WidgetContext) => [ctx.orgId, ctx.filters.from, ctx.filters.to, ctx.filters.owner, ctx.filters.source] as const;

function exportLink(ctx: WidgetContext, section: string) {
  if (!ctx.canExport) return null;
  const f = ctx.filters;
  const href = `/reports/export?${queryString({ section, period: "custom", from: f.from, to: f.to, owner: f.owner, source: f.source })}`;
  return (
    <a href={href} download className="rounded-md px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800">
      CSV
    </a>
  );
}

// --- Drill-down requests ---------------------------------------------------------------

const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

// What a click opens: the leads behind one number, with the dashboard's filters.
function drill(ctx: WidgetContext, source: string, title: string, queries: DrillQuery[], range?: { from: string; to: string }): DrillRequest {
  const from = range?.from ?? ctx.filters.from;
  const to = range?.to ?? ctx.filters.to;
  return { eyebrow: `${source} · ${periodLabel({ ...ctx.filters, from, to })}`, title, from, to, owner: ctx.filters.owner, source: ctx.filters.source, queries };
}

// Snapshot numbers ignore the period.
const rightNow = (request: DrillRequest): DrillRequest => ({ ...request, eyebrow: `${request.eyebrow.split(" · ")[0]} · Right now` });

// A bucket's own dates, clipped to the period (the first week can start before it).
function bucketRange(buckets: string[], i: number, f: { from: string; to: string }) {
  const start = buckets[i]!;
  const next = buckets[i + 1];
  const end = next ? addDays(next, -1) : f.to;
  return { from: start < f.from ? f.from : start, to: end > f.to ? f.to : end };
}

// --- Numbers -------------------------------------------------------------------------

async function KpiWidget({ w, ctx }: { w: WidgetOf<"kpi">; ctx: WidgetContext }) {
  const [report, kpis] = await Promise.all([reportFor(...args(ctx)), kpisFor(...args(ctx))]);
  const money = (n: number) => formatMoney(n, ctx.currency);
  const k = report.kpis, p = report.previous, cur = kpis.current, prev = kpis.previous, series = kpis.series;
  const label = widgetTitle(w);
  const won = drill(ctx, label, "Won", [{ kind: "won" }]);
  const open = rightNow(drill(ctx, label, "Open leads", [{ kind: "open" }]));
  const request = ({
    new_leads: drill(ctx, label, "New leads", [{ kind: "new" }]),
    won_value: won,
    win_rate: drill(ctx, label, "Won and lost", [{ kind: "won" }, { kind: "lost" }]),
    avg_deal: won,
    time_to_close: won,
    open_value: open,
    weighted_value: open,
  } as Partial<Record<KpiMetric, DrillRequest>>)[w.options.metric];
  const spark = (values: (number | null)[]) => (w.options.sparkline ? carry(values) : undefined);
  const delta = <T,>(d: T) => (ctx.compare ? d : null);

  switch (w.options.metric) {
    case "new_leads":
      return <DrillStatTile request={request} label={label} value={k.new_leads.toLocaleString("en")} delta={delta(change(k.new_leads, p.new_leads))} trend={spark(series.map((s) => s.new_leads))} />;
    case "won_value":
      return <DrillStatTile request={request} label={label} value={money(k.won_value)} delta={delta(change(k.won_value, p.won_value))} note={`${k.won_count} won`} trend={spark(series.map((s) => Number(s.won_value)))} />;
    case "win_rate": {
      const rate = winRate(k.won_count, k.lost_count);
      return (
        <DrillStatTile
          request={request}
          label={label}
          value={pct(rate)}
          delta={delta(pointChange(rate, winRate(p.won_count, p.lost_count)))}
          note={`${k.won_count} won · ${k.lost_count} lost`}
          trend={spark(series.map((s) => winRate(s.won_count, s.lost_count)))}
        />
      );
    }
    case "avg_deal": {
      const avg = k.won_count ? k.won_value / k.won_count : null;
      const prevAvg = p.won_count ? p.won_value / p.won_count : null;
      return (
        <DrillStatTile
          request={request}
          label={label}
          value={avg === null ? "—" : money(avg)}
          delta={delta(avg !== null && prevAvg !== null ? change(avg, prevAvg) : null)}
          trend={spark(series.map((s) => (s.won_count ? Number(s.won_value) / s.won_count : null)))}
        />
      );
    }
    case "open_value":
      return <DrillStatTile request={request} label={label} value={money(k.open_value)} note={`${k.open_count} open lead${k.open_count === 1 ? "" : "s"}`} />;
    case "weighted_value":
      return (
        <DrillStatTile
          request={request}
          label={label}
          value={money(k.weighted_value)}
          delta={delta(change(Number(k.weighted_value), Number(prev.weighted_value), true, VS_START))}
          note="Value × stage win chance"
          trend={spark(series.map((s) => Number(s.weighted_value)))}
        />
      );
    case "time_to_close":
      return (
        <DrillStatTile
          request={request}
          label={label}
          value={days(k.avg_days_to_close)}
          delta={delta(k.avg_days_to_close !== null && p.avg_days_to_close ? change(k.avg_days_to_close, p.avg_days_to_close, false) : null)}
          note="Average for leads won"
        />
      );
    case "velocity": {
      const rate = winRate(k.won_count, k.lost_count);
      const avg = k.won_count ? k.won_value / k.won_count : null;
      // Expected revenue per day from the open pipeline at the current pace.
      const v = rate !== null && avg !== null && k.avg_days_to_close ? (k.open_count * rate * avg) / Math.max(k.avg_days_to_close, 1) : null;
      return <DrillStatTile request={request} label={label} value={v === null ? "—" : `${money(v)}/day`} note="Open leads × win rate × avg deal ÷ days to close" />;
    }
    case "activities":
      return <DrillStatTile request={request} label={label} value={cur.activities.toLocaleString("en")} delta={delta(change(cur.activities, prev.activities))} note="Calls, emails, notes, meetings and tasks" trend={spark(series.map((s) => s.activities))} />;
    case "median_reply":
      return (
        <DrillStatTile
          request={request}
          label={label}
          value={hours(cur.median_reply_hours)}
          delta={delta(cur.median_reply_hours !== null && prev.median_reply_hours ? change(cur.median_reply_hours, prev.median_reply_hours, false) : null)}
          note="Form and API leads, until a call, meeting or email"
          trend={spark(series.map((s) => s.median_reply_hours))}
        />
      );
  }
}

// --- Over time ------------------------------------------------------------------------

const MEASURE = {
  won_value: { title: "Won value", description: "by close date" },
  won_count: { title: "Won", description: "leads won, by close date" },
  new_leads: { title: "New leads", description: "created" },
} as const;

async function TrendWidget({ w, ctx }: { w: WidgetOf<"trend">; ctx: WidgetContext }) {
  const { measure, split, chart } = w.options;
  const data = await splitFor(...args(ctx), measure, split);
  const money = measure === "won_value";
  const labels = data.buckets.map((b) => bucketLabel(b, data.bucket));
  const value = (bucket: string, keys: (string | null)[]) =>
    data.rows.filter((r) => r.bucket === bucket && keys.includes(r.key)).reduce((sum, r) => sum + Number(r.value), 0);

  // Colour follows the source or person (their position), never their rank in
  // this result. Past the sixth, and "No source"/"No owner", fold into one muted series.
  let series: Series[];
  // Which source or owner ids each series stands for (several for the folded one).
  let keysOf: Record<string, (string | null)[]> = {};
  if (split === "none") {
    series = [{ key: "all", label: MEASURE[measure].title, color: "accent", values: data.buckets.map((b) => value(b, ["all"])) }];
  } else {
    const named = data.keys.filter((k) => k.position !== null && k.position < 6);
    const rest = data.keys.filter((k) => k.position === null || k.position >= 6);
    const restLabel = rest.some((k) => k.position !== null) ? "Other" : (rest[0]?.name ?? "Other");
    series = [
      ...named.map((k) => ({ key: k.key!, label: k.name, color: (k.position! + 1) as SeriesColor, values: data.buckets.map((b) => value(b, [k.key])) })),
      { key: "rest", label: restLabel, color: "muted" as const, values: data.buckets.map((b) => value(b, rest.map((k) => k.key))) },
    ].filter((s) => s.values.some((v) => v > 0));
    keysOf = Object.fromEntries([...named.map((k) => [k.key!, [k.key]]), ["rest", rest.map((k) => k.key)]]);
  }

  // Each column, and each segment of it, opens its own leads.
  const kind = measure === "new_leads" ? "new" : "won";
  const requests: Record<string, DrillRequest> = {};
  data.buckets.forEach((_, i) => {
    const range = bucketRange(data.buckets, i, ctx.filters);
    requests[String(i)] = drill(ctx, widgetTitle(w), MEASURE[measure].title, [{ kind }], range);
    for (const s of split === "none" ? [] : series) {
      const queries = (keysOf[s.key] ?? []).map((key): DrillQuery => ({ kind, params: { split, key: key ?? "none" } }));
      if (queries.length) requests[`${i}:${s.key}`] = drill(ctx, widgetTitle(w), `${MEASURE[measure].title} · ${s.label}`, queries, range);
    }
  });

  const valueFormat = money ? ({ kind: "money", currency: ctx.currency } as const) : ({ kind: "number" } as const);
  const fmt = (n: number) => (money ? formatMoney(n, ctx.currency) : n);
  return (
    <ChartCard
      title={widgetTitle(w)}
      description={`Per ${data.bucket}, ${MEASURE[measure].description}`}
      actions={exportLink(ctx, "timeline")}
      table={<DataTable head={["Period", ...series.map((s) => s.label)]} rows={data.buckets.map((b, i) => [labels[i]!, ...series.map((s) => fmt(s.values[i] ?? 0))])} />}
    >
      {series.length ? (
        chart === "lines" ? (
          <LineChart labels={labels} series={series} valueFormat={valueFormat} />
        ) : (
          <DrillColumnChart labels={labels} series={series} valueFormat={valueFormat} stacked requests={requests} />
        )
      ) : (
        <p className="py-6 text-center text-sm text-zinc-500">Nothing in this period.</p>
      )}
    </ChartCard>
  );
}

async function WonLostWidget({ w, ctx }: { w: WidgetOf<"won_lost">; ctx: WidgetContext }) {
  const report = await reportFor(...args(ctx));
  const labels = report.timeline.map((t) => bucketLabel(t.bucket, report.bucket));
  const buckets = report.timeline.map((t) => t.bucket);
  const requests: Record<string, DrillRequest> = {};
  buckets.forEach((_, i) => {
    const range = bucketRange(buckets, i, ctx.filters);
    requests[String(i)] = drill(ctx, widgetTitle(w), "Won and lost", [{ kind: "won" }, { kind: "lost" }], range);
    requests[`${i}:won`] = drill(ctx, widgetTitle(w), "Won", [{ kind: "won" }], range);
    requests[`${i}:lost`] = drill(ctx, widgetTitle(w), "Lost", [{ kind: "lost" }], range);
  });
  return (
    <ChartCard
      title={widgetTitle(w)}
      description={`Leads closed per ${report.bucket}`}
      actions={exportLink(ctx, "timeline")}
      table={<DataTable head={["Period", "Won", "Lost"]} rows={report.timeline.map((t, i) => [labels[i]!, t.won_count, t.lost_count])} />}
    >
      <DrillColumnChart
        requests={requests}
        labels={labels}
        series={[
          { key: "won", label: "Won", color: "accent", values: report.timeline.map((t) => t.won_count) },
          { key: "lost", label: "Lost", color: "muted", values: report.timeline.map((t) => t.lost_count) },
        ]}
      />
    </ChartCard>
  );
}

// --- Breakdowns -----------------------------------------------------------------------

async function FunnelWidget({ w, ctx }: { w: WidgetOf<"funnel">; ctx: WidgetContext }) {
  const report = await reportFor(...args(ctx));
  const created = report.kpis.new_leads;
  const step = (i: number) => (i === 0 ? created : report.funnel[i - 1]!.reached);
  const requests: Record<string, DrillRequest> = {
    created: drill(ctx, widgetTitle(w), "Created in this period", [{ kind: "new" }]),
    ...Object.fromEntries(
      report.funnel.map((f) => [
        f.stage_id,
        drill(ctx, widgetTitle(w), f.is_won ? "Won" : `Reached ${f.name}`, [{ kind: "funnel", params: f.is_won ? { won: true } : { stage_id: f.stage_id } }]),
      ]),
    ),
  };
  return (
    <ChartCard
      title={widgetTitle(w)}
      description="How far the leads created in this period got"
      actions={exportLink(ctx, "funnel")}
      table={
        <DataTable
          head={["Step", "Leads", "Of created", "From previous step"]}
          rows={[
            ["Created", created, created ? "100%" : "—", "—"],
            ...report.funnel.map((f, i) => [f.name, f.reached, created ? pct(f.reached / created) : "—", step(i) ? pct(f.reached / step(i)) : "—"]),
          ]}
        />
      }
    >
      <DrillBarList
        requests={requests}
        empty="No leads were created in this period."
        rows={
          created
            ? [
                { key: "created", label: "Created", value: created, display: String(created) },
                ...report.funnel.map((f, i) => ({
                  key: f.stage_id,
                  label: f.name,
                  value: f.reached,
                  display: `${f.reached} · ${pct(f.reached / created)}`,
                  detail: step(i) ? `${pct(f.reached / step(i))} of the previous step` : undefined,
                })),
              ]
            : []
        }
      />
    </ChartCard>
  );
}

async function StagesWidget({ w, ctx }: { w: WidgetOf<"stages">; ctx: WidgetContext }) {
  const report = await reportFor(...args(ctx));
  const money = (n: number) => formatMoney(n, ctx.currency);
  return (
    <ChartCard
      title={widgetTitle(w)}
      description="Right now, regardless of period"
      actions={exportLink(ctx, "stages")}
      table={<DataTable head={["Stage", "Leads", "Value", "Win chance"]} rows={report.stages.map((s) => [s.name, s.count, money(s.value), `${s.probability}%`])} />}
    >
      <DrillBarList
        requests={Object.fromEntries(report.stages.map((s) => [s.stage_id, rightNow(drill(ctx, widgetTitle(w), `Open in ${s.name}`, [{ kind: "open", params: { stage_id: s.stage_id } }]))]))}
        empty="No open leads."
        rows={
          report.stages.some((s) => s.count)
            ? report.stages.map((s) => ({ key: s.stage_id, label: s.name, value: Number(s.value), display: money(s.value), detail: `${s.count} lead${s.count === 1 ? "" : "s"} · ${s.probability}% win chance` }))
            : []
        }
      />
    </ChartCard>
  );
}

async function VelocityWidget({ w, ctx }: { w: WidgetOf<"velocity">; ctx: WidgetContext }) {
  const report = await reportFor(...args(ctx));
  return (
    <ChartCard
      title={widgetTitle(w)}
      description="Average time before leads moved on, for moves in this period"
      actions={exportLink(ctx, "velocity")}
      table={<DataTable head={["Stage", "Average days", "Moves"]} rows={report.velocity.map((v) => [v.name, v.avg_days ?? "—", v.stays])} />}
    >
      <BarList
        empty="No leads moved between stages in this period."
        rows={report.velocity
          .filter((v) => v.avg_days !== null)
          .map((v) => ({ key: v.stage_id, label: v.name, value: Number(v.avg_days), display: days(Number(v.avg_days)), detail: `Based on ${v.stays} move${v.stays === 1 ? "" : "s"}` }))}
      />
    </ChartCard>
  );
}

async function LostReasonsWidget({ w, ctx }: { w: WidgetOf<"lost_reasons">; ctx: WidgetContext }) {
  const report = await reportFor(...args(ctx));
  const money = (n: number) => formatMoney(n, ctx.currency);
  return (
    <ChartCard
      title={widgetTitle(w)}
      description="Leads lost in this period"
      actions={exportLink(ctx, "lost_reasons")}
      table={<DataTable head={["Reason", "Leads", "Value"]} rows={report.lost_reasons.map((r) => [r.reason, r.count, money(r.value)])} />}
    >
      <DrillBarList
        requests={Object.fromEntries(report.lost_reasons.map((r) => [r.reason, drill(ctx, widgetTitle(w), `Lost: ${r.reason}`, [{ kind: "lost", params: { reason: r.reason } }])]))}
        empty="No leads were lost in this period."
        rows={report.lost_reasons.map((r) => ({ key: r.reason, label: r.reason, value: r.count, display: String(r.count), detail: `${money(r.value)} in value` }))}
      />
    </ChartCard>
  );
}

async function SourcesWidget({ w, ctx }: { w: WidgetOf<"sources">; ctx: WidgetContext }) {
  const report = await reportFor(...args(ctx));
  const money = (n: number) => formatMoney(n, ctx.currency);
  return (
    <ChartCard
      title={widgetTitle(w)}
      description="Leads created in this period, by where they came from"
      actions={exportLink(ctx, "sources")}
      table={
        <DataTable
          head={["Source", "Leads", "Won", "Lost", "Win rate", "Won value", "Open value"]}
          rows={report.sources.map((s) => [s.name, s.leads, s.won, s.lost, pct(winRate(s.won, s.lost)), money(s.won_value), money(s.open_value)])}
        />
      }
    >
      <DrillBarList
        requests={Object.fromEntries(
          report.sources.map((s) => [s.source_id ?? "none", drill(ctx, widgetTitle(w), `New leads from ${s.name}`, [{ kind: "new", params: { split: "source", key: s.source_id ?? "none" } }])]),
        )}
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
  );
}

async function TeamWidget({ w, ctx }: { w: WidgetOf<"team">; ctx: WidgetContext }) {
  const report = await reportFor(...args(ctx));
  const money = (n: number) => formatMoney(n, ctx.currency);
  const maxWon = Math.max(1, ...report.leaderboard.map((x) => Number(x.won_value)));
  return (
    <ChartCard title={widgetTitle(w)} description="Per person, for this period (open pipeline is right now)" actions={exportLink(ctx, "leaderboard")}>
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
            {report.leaderboard.map((r) => (
              <tr key={r.user_id}>
                <td className="py-2 pr-3 text-zinc-900 dark:text-zinc-100">
                  <DrillButton request={drill(ctx, widgetTitle(w), `Won by ${r.name}`, [{ kind: "won", params: { split: "owner", key: r.user_id } }])}>{r.name}</DrillButton>
                </td>
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
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}

// --- Dispatch -------------------------------------------------------------------------

function renderWidget(w: Widget, ctx: WidgetContext): Promise<ReactNode> | ReactNode {
  switch (w.type) {
    case "kpi":
      return <KpiWidget w={w} ctx={ctx} />;
    case "trend":
      return <TrendWidget w={w} ctx={ctx} />;
    case "won_lost":
      return <WonLostWidget w={w} ctx={ctx} />;
    case "funnel":
      return <FunnelWidget w={w} ctx={ctx} />;
    case "stages":
      return <StagesWidget w={w} ctx={ctx} />;
    case "velocity":
      return <VelocityWidget w={w} ctx={ctx} />;
    case "lost_reasons":
      return <LostReasonsWidget w={w} ctx={ctx} />;
    case "sources":
      return <SourcesWidget w={w} ctx={ctx} />;
    case "team":
      return <TeamWidget w={w} ctx={ctx} />;
  }
}

export function WidgetView({ w, ctx }: { w: Widget; ctx: WidgetContext }) {
  return renderWidget(w, ctx);
}

export function WidgetSkeleton({ w }: { w: Widget }) {
  return <div aria-hidden className={`animate-pulse rounded-xl bg-white/60 ring-1 ring-hairline dark:bg-zinc-900/60 ${w.type === "kpi" ? "h-32" : "h-80"}`} />;
}
