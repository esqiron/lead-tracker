import { z } from "zod";

// A dashboard is a named list of widgets plus default filters. The layout is
// stored as one jsonb array (see supabase/migrations/*_dashboards.sql) and
// validated here on read and on every write. No server-only imports, so the
// editor can share these definitions.

export const SPANS = [3, 4, 6, 8, 12] as const;
export type Span = (typeof SPANS)[number];

export const KPI_METRICS = {
  new_leads: "New leads",
  won_value: "Won",
  win_rate: "Win rate",
  avg_deal: "Average deal",
  open_value: "Open pipeline (now)",
  weighted_value: "Weighted pipeline (now)",
  time_to_close: "Time to close",
  velocity: "Sales velocity",
  activities: "Activities logged",
  median_reply: "Median first reply",
  won_quarter: "Won this quarter",
} as const;
export type KpiMetric = keyof typeof KPI_METRICS;

const base = {
  id: z.string().min(1).max(40),
  span: z.union(SPANS.map((s) => z.literal(s)) as [z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<6>, z.ZodLiteral<8>, z.ZodLiteral<12>]),
  title: z.string().trim().min(1).max(80).optional(),
};
const noOptions = z.object({}).default({});

const widgetSchema = z.discriminatedUnion("type", [
  z.object({
    ...base,
    type: z.literal("kpi"),
    options: z.object({ metric: z.enum(Object.keys(KPI_METRICS) as [KpiMetric, ...KpiMetric[]]), sparkline: z.boolean().default(true) }),
  }),
  z.object({
    ...base,
    type: z.literal("trend"),
    options: z.object({
      measure: z.enum(["won_value", "won_count", "new_leads"]),
      split: z.enum(["none", "source", "owner"]).default("none"),
      chart: z.enum(["columns", "lines"]).default("columns"),
    }),
  }),
  z.object({ ...base, type: z.literal("won_lost"), options: noOptions }),
  z.object({ ...base, type: z.literal("funnel"), options: noOptions }),
  z.object({ ...base, type: z.literal("stages"), options: noOptions }),
  z.object({ ...base, type: z.literal("velocity"), options: noOptions }),
  z.object({ ...base, type: z.literal("lost_reasons"), options: noOptions }),
  z.object({ ...base, type: z.literal("sources"), options: noOptions }),
  z.object({ ...base, type: z.literal("team"), options: noOptions }),
  z.object({
    ...base,
    type: z.literal("forecast"),
    options: z.object({ range: z.boolean().default(true), previous: z.boolean().default(true) }).default({ range: true, previous: true }),
  }),
  z.object({ ...base, type: z.literal("quota"), options: noOptions }),
]);
export type Widget = z.infer<typeof widgetSchema>;
export type WidgetType = Widget["type"];
export type WidgetOf<T extends WidgetType> = Extract<Widget, { type: T }>;

export const layoutSchema = z.array(widgetSchema).max(40);

// Reading is forgiving: a widget that no longer validates (an old option, a
// removed type) is dropped instead of breaking the whole dashboard.
export function parseLayout(raw: unknown): Widget[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const parsed = widgetSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

export const filtersSchema = z.object({
  period: z.string().max(20).optional(),
  from: z.string().max(10).optional(),
  to: z.string().max(10).optional(),
  owner: z.string().max(36).optional(),
  source: z.string().max(36).optional(),
  // Show changes against the previous period on numbers.
  compare: z.boolean().optional(),
});
export type DashboardFilters = z.infer<typeof filtersSchema>;

export function parseFilters(raw: unknown): DashboardFilters {
  const parsed = filtersSchema.safeParse(raw);
  return parsed.success ? parsed.data : {};
}

export type Dashboard = {
  // A uuid for saved dashboards, the template key for templates.
  id: string;
  name: string;
  visibility: "private" | "org";
  filters: DashboardFilters;
  layout: Widget[];
  template: string | null;
  saved: boolean;
  createdBy: string | null;
};

// Templates are layouts in code. Until a team saves its own dashboards, the
// Reports page shows these; editing one (later) saves a copy.
const kpi = (id: string, metric: KpiMetric, sparkline = true): Widget => ({ id, type: "kpi", span: 3, options: { metric, sparkline } });

export const TEMPLATES = {
  "pipeline-health": {
    name: "Pipeline health",
    filters: { period: "this_month", compare: true },
    layout: [
      kpi("new-leads", "new_leads"),
      kpi("won", "won_value"),
      kpi("win-rate", "win_rate"),
      kpi("avg-deal", "avg_deal"),
      kpi("open", "open_value", false),
      kpi("weighted", "weighted_value"),
      kpi("time-to-close", "time_to_close", false),
      kpi("velocity", "velocity", false),
      { id: "forecast", type: "forecast", span: 8, options: { range: true, previous: true } },
      { id: "quota", type: "quota", span: 4, options: {} },
      { id: "won-by-source", type: "trend", span: 6, title: "Won value", options: { measure: "won_value", split: "source", chart: "columns" } },
      { id: "won-lost", type: "won_lost", span: 6, options: {} },
      { id: "new-leads-trend", type: "trend", span: 6, options: { measure: "new_leads", split: "none", chart: "columns" } },
      { id: "funnel", type: "funnel", span: 6, options: {} },
      { id: "stages", type: "stages", span: 6, options: {} },
      { id: "velocity-stages", type: "velocity", span: 6, options: {} },
      { id: "lost", type: "lost_reasons", span: 6, options: {} },
      { id: "sources", type: "sources", span: 6, options: {} },
      { id: "team", type: "team", span: 12, options: {} },
    ],
  },
} satisfies Record<string, { name: string; filters: DashboardFilters; layout: Widget[] }>;
export type TemplateKey = keyof typeof TEMPLATES;

export function templateDashboard(key: TemplateKey): Dashboard {
  const t = TEMPLATES[key];
  return { id: key, name: t.name, visibility: "org", filters: t.filters, layout: t.layout, template: key, saved: false, createdBy: null };
}

export const isTemplateKey = (key: string): key is TemplateKey => Object.hasOwn(TEMPLATES, key);

// What the widget library offers, and each type's defaults.
export const WIDGET_TYPES: Record<WidgetType, { name: string; group: "Numbers" | "Over time" | "Breakdowns"; description: string; span: Span; options: Widget["options"] }> = {
  kpi: { name: "Number", group: "Numbers", description: "One figure, its change and a trend line", span: 3, options: { metric: "new_leads", sparkline: true } },
  trend: { name: "Over time", group: "Over time", description: "Won value, deals won or new leads per period, split by source or owner", span: 6, options: { measure: "won_value", split: "source", chart: "columns" } },
  won_lost: { name: "Won and lost", group: "Over time", description: "Deals closed per period, won against lost", span: 6, options: {} },
  funnel: { name: "Conversion funnel", group: "Breakdowns", description: "How far new leads got through your stages", span: 6, options: {} },
  stages: { name: "Open pipeline by stage", group: "Breakdowns", description: "Value sitting in each stage right now", span: 6, options: {} },
  velocity: { name: "Days in each stage", group: "Breakdowns", description: "How long leads stay before moving on", span: 6, options: {} },
  lost_reasons: { name: "Lost reasons", group: "Breakdowns", description: "Why deals were lost, and what they were worth", span: 6, options: {} },
  sources: { name: "Sources", group: "Breakdowns", description: "Where new leads came from and how they did", span: 6, options: {} },
  team: { name: "Team", group: "Breakdowns", description: "Won value, win rate and activity per person", span: 12, options: {} },
  forecast: { name: "Quarter forecast", group: "Over time", description: "Won so far, what the pipeline should add by the quarter's end, and the goal", span: 8, options: { range: true, previous: true } },
  quota: { name: "Team vs goal", group: "Breakdowns", description: "Each person's won value and forecast against their goal this quarter", span: 4, options: {} },
};

export const TREND_MEASURES = { won_value: "Won value", won_count: "Won", new_leads: "New leads" } as const;

// The title a widget shows when nobody has renamed it.
export function widgetTitle(w: Widget): string {
  if (w.title) return w.title;
  if (w.type === "kpi") return KPI_METRICS[w.options.metric];
  if (w.type === "trend") {
    const split = w.options.split === "source" ? " by source" : w.options.split === "owner" ? " by owner" : "";
    return `${TREND_MEASURES[w.options.measure]}${split}`;
  }
  if (w.type === "won_lost") return "Won and lost";
  return WIDGET_TYPES[w.type].name;
}

export function newWidget(type: WidgetType, options?: Partial<Widget["options"]>): Widget {
  const t = WIDGET_TYPES[type];
  return { id: Math.random().toString(36).slice(2, 10), type, span: t.span, options: { ...t.options, ...options } } as Widget;
}

// Drill-down: what's behind one number. Widgets describe each clickable cell
// as a request; the sheet runs it through report_drill() (one call per query,
// results merged) and lists the leads.
export const DRILL_KINDS = ["new", "won", "lost", "open", "funnel", "aging", "reply"] as const;
export type DrillQuery = { kind: (typeof DRILL_KINDS)[number]; params?: Record<string, string | number | boolean> };
export type DrillRequest = {
  // Where the number came from ("Won value · 26 Oct – 1 Nov") and what was clicked.
  eyebrow: string;
  title: string;
  from: string;
  to: string;
  owner?: string;
  source?: string;
  queries: DrillQuery[];
};
