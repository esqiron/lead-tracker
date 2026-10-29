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
  return { id: key, name: t.name, visibility: "org", filters: t.filters, layout: t.layout, template: key, saved: false };
}

export const isTemplateKey = (key: string): key is TemplateKey => Object.hasOwn(TEMPLATES, key);
