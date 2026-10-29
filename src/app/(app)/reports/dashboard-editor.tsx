"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { buttonClass, cx, Input, Select } from "@/components/ui";
import {
  KPI_METRICS,
  newWidget,
  SPANS,
  TEMPLATES,
  TREND_MEASURES,
  WIDGET_TYPES,
  widgetTitle,
  type DashboardFilters,
  type KpiMetric,
  type Span,
  type Widget,
  type WidgetType,
} from "@/lib/dashboards";
import { DrillProvider } from "./drill";
import { createDashboard, deleteDashboard, duplicateDashboard, resetToTemplate, restoreDashboard, saveDashboard, saveTemplateCopy, type DashboardPatch } from "./actions";

export type EditorDashboard = {
  id: string;
  name: string;
  visibility: "private" | "org";
  template: string | null;
  saved: boolean;
  filters: DashboardFilters;
  layout: Widget[];
};

// Numbers sit two to a row on phones and charts take the full width; half
// width on tablets; the saved width from large screens up.
const SPAN_CLASS: Record<Span, string> = {
  3: "sm:col-span-6 lg:col-span-3",
  4: "sm:col-span-6 lg:col-span-4",
  6: "sm:col-span-12 lg:col-span-6",
  8: "sm:col-span-12 lg:col-span-8",
  12: "sm:col-span-12",
};
const SPAN_LABEL: Record<Span, string> = { 3: "¼", 4: "⅓", 6: "½", 8: "⅔", 12: "Full" };

type SaveState = { status: "idle" | "saving" | "saved" } | { status: "error"; message: string };

export function DashboardEditor({
  dashboard,
  nodes,
  editing,
  canEdit,
  canShare,
  description,
  filterBar,
  deleted,
  currency,
}: {
  dashboard: EditorDashboard;
  // Server-rendered widget bodies by widget id.
  nodes: Record<string, ReactNode>;
  editing: boolean;
  canEdit: boolean;
  canShare: boolean;
  description: ReactNode;
  filterBar: ReactNode;
  // A dashboard just deleted, for the Undo toast.
  deleted: string | null;
  currency: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [layout, setLayout] = useState(dashboard.layout);
  const [name, setName] = useState(dashboard.name);
  const [visibility, setVisibility] = useState(dashboard.visibility);
  const [selected, setSelectedState] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const setSelected = (id: string | null) => {
    setSelectedState(id);
    if (id) setSheetOpen(true);
  };
  // Widgets whose server rendering is out of date (new, or options changed).
  const [stale, setStale] = useState<Set<string>>(new Set());
  const [save, setSave] = useState<SaveState>({ status: "idle" });
  const [busy, startBusy] = useTransition();
  const [, startSave] = useTransition();
  const queued = useRef<{ patch: DashboardPatch; rerender: boolean; staleIds: string[] }>({ patch: {}, rerender: false, staleIds: [] });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Autosave: collect changes for a moment, then send them in one go.
  const flush = () => {
    const { patch, rerender, staleIds } = queued.current;
    queued.current = { patch: {}, rerender: false, staleIds: [] };
    timer.current = null;
    if (!Object.keys(patch).length) return;
    setSave({ status: "saving" });
    startSave(async () => {
      const result = await saveDashboard(dashboard.id, patch, rerender);
      if (result.error) setSave({ status: "error", message: result.error });
      else setSave({ status: "saved" });
      if (staleIds.length) setStale((s) => new Set([...s].filter((id) => !staleIds.includes(id))));
    });
  };
  const queue = (patch: DashboardPatch, opts: { rerender?: boolean; staleIds?: string[]; now?: boolean } = {}) => {
    const q = queued.current;
    q.patch = { ...q.patch, ...patch };
    q.rerender ||= Boolean(opts.rerender);
    q.staleIds.push(...(opts.staleIds ?? []));
    if (opts.staleIds?.length) setStale((s) => new Set([...s, ...opts.staleIds!]));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, opts.now ? 0 : 600);
  };
  // Leaving the page with changes still waiting: send them anyway.
  useEffect(() => {
    const id = dashboard.id;
    return () => {
      if (!timer.current) return;
      clearTimeout(timer.current);
      const { patch } = queued.current;
      if (Object.keys(patch).length) void saveDashboard(id, patch);
    };
  }, [dashboard.id]);

  const updateLayout = (next: Widget[], opts?: { rerender?: boolean; staleIds?: string[] }) => {
    setLayout(next);
    queue({ layout: next }, opts);
  };
  const updateWidget = (id: string, change: Partial<Widget>, rerender = true) => {
    const next = layout.map((w) => (w.id === id ? ({ ...w, ...change, options: { ...w.options, ...(change.options ?? {}) } } as Widget) : w));
    updateLayout(next, rerender ? { rerender: true, staleIds: [id] } : undefined);
  };
  const move = (id: string, by: number) => {
    const i = layout.findIndex((w) => w.id === id), j = i + by;
    if (i < 0 || j < 0 || j >= layout.length) return;
    const next = [...layout];
    const [w] = next.splice(i, 1);
    next.splice(j, 0, w!);
    updateLayout(next);
  };
  const moveTo = (id: string, targetId: string) => {
    if (id === targetId) return;
    const next = layout.filter((w) => w.id !== id);
    const from = layout.findIndex((w) => w.id === id), to = layout.findIndex((w) => w.id === targetId);
    next.splice(next.findIndex((w) => w.id === targetId) + (from < to ? 1 : 0), 0, layout[from]!);
    updateLayout(next);
  };
  const remove = (id: string) => {
    if (selected === id) setSelected(null);
    updateLayout(layout.filter((w) => w.id !== id));
  };
  const add = (type: WidgetType, options?: Partial<Widget["options"]>) => {
    const w = newWidget(type, options);
    updateLayout([...layout, w], { rerender: true, staleIds: [w.id] });
    setSelected(w.id);
    requestAnimationFrame(() => document.getElementById(`widget-${w.id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  };

  const startEditing = () =>
    startBusy(async () => {
      if (dashboard.saved) return router.push(withParams(pathname, searchParams, { edit: "1" }));
      // A built-in dashboard: save the team's own copy first, then edit that.
      const result = await saveTemplateCopy(dashboard.id);
      if (result.id) router.push(`/reports/${result.id}?edit=1`);
      else setSave({ status: "error", message: result.error ?? "Couldn't save a copy." });
    });

  // Leaving edit mode makes the filters in the URL this dashboard's defaults.
  const finishEditing = () => {
    const filters = filtersFromUrl(searchParams, dashboard.filters);
    if (filters) queue({ filters }, { now: true, rerender: true });
    else if (timer.current) {
      clearTimeout(timer.current);
      flush();
    }
    setSelected(null);
    router.replace(pathname, { scroll: false });
  };

  const open = (result: { id?: string; error?: string }, edit = true) => {
    if (result.id) router.push(`/reports/${result.id}${edit ? "?edit=1" : ""}`);
    else setSave({ status: "error", message: result.error ?? "Something went wrong." });
  };

  const selectedWidget = editing ? layout.find((w) => w.id === selected) : undefined;

  return (
    <div className="space-y-6">
      {deleted ? <DeletedToast id={deleted} /> : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          {editing ? (
            <Input
              aria-label="Dashboard name"
              value={name}
              maxLength={80}
              onChange={(e) => {
                setName(e.target.value);
                if (e.target.value.trim()) queue({ name: e.target.value });
              }}
              className="h-12 max-w-xl font-display text-2xl! font-semibold tracking-[-0.03em]"
            />
          ) : (
            <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] text-zinc-900 dark:text-zinc-100">{name}</h1>
          )}
          <div className="mt-1 text-sm text-zinc-500">{description}</div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {editing ? (
            <>
              <SaveStatus state={save} />
              {dashboard.template ? (
                <button type="button" disabled={busy} className={buttonClass("ghost")} onClick={() => startBusy(async () => {
                  const result = await resetToTemplate(dashboard.id);
                  if (result.error) setSave({ status: "error", message: result.error });
                  else router.refresh();
                })}>
                  Reset to template
                </button>
              ) : null}
              <DeleteButton onDelete={() => startBusy(async () => {
                const result = await deleteDashboard(dashboard.id);
                if (result.error) setSave({ status: "error", message: result.error });
                else router.push(`/reports?deleted=${dashboard.id}`);
              })} />
              <button type="button" className={buttonClass("primary")} onClick={finishEditing}>
                Done
              </button>
            </>
          ) : (
            <>
              <NewDashboardMenu disabled={busy} onCreate={(template) => startBusy(async () => open(await createDashboard({ template })))} />
              {canEdit || !dashboard.saved ? (
                <button type="button" disabled={busy} className={buttonClass("primary")} onClick={startEditing}>
                  Edit dashboard
                </button>
              ) : (
                <button type="button" disabled={busy} className={buttonClass("secondary")} onClick={() => startBusy(async () => open(await duplicateDashboard(dashboard.id)))}>
                  Duplicate to edit
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {editing ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-accent-soft px-4 py-2.5 text-sm text-accent-ink">
          <span className="basis-full sm:flex-1 sm:basis-auto">Drag widgets to move them, click one to change it, or add more from the panel. Filters you set while editing become this dashboard&apos;s defaults.</span>
          {canShare ? (
            <label className="flex cursor-pointer items-center gap-2 font-medium select-none">
              <input
                type="checkbox"
                checked={visibility === "org"}
                onChange={(e) => {
                  const next = e.target.checked ? "org" : "private";
                  setVisibility(next);
                  queue({ visibility: next }, { now: true });
                }}
                className="size-4 accent-[var(--accent)]"
              />
              Share with the team
            </label>
          ) : null}
          <button type="button" className="font-medium underline-offset-2 hover:underline" disabled={busy} onClick={() => startBusy(async () => open(await duplicateDashboard(dashboard.id)))}>
            Duplicate
          </button>
        </div>
      ) : save.status === "error" ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">{save.message}</p>
      ) : null}

      {filterBar}

      <div className={cx("grid items-start gap-5", editing && "lg:grid-cols-[minmax(0,1fr)_20rem]")}>
        <DrillProvider enabled={!editing} currency={currency}>
          <WidgetGrid
            layout={layout}
            nodes={nodes}
            stale={stale}
            editing={editing}
            selected={selected}
            onSelect={setSelected}
            onMove={move}
            onMoveTo={moveTo}
            onResize={(id, span) => updateWidget(id, { span }, false)}
            onRemove={remove}
          />
        </DrillProvider>
        {editing ? (
          <aside
            aria-label={selectedWidget ? "Widget settings" : "Add a widget"}
            className="fixed inset-x-2 bottom-2 z-30 max-h-[55vh] overflow-y-auto rounded-3xl bg-white p-5 shadow-[0_12px_32px_-8px_rgba(16,24,40,0.3)] ring-1 ring-hairline lg:sticky lg:inset-auto lg:top-20 lg:z-auto lg:max-h-[calc(100vh-6rem)] lg:shadow-sm dark:bg-zinc-900"
          >
            {/* On small screens the panel folds down to a bar until it's needed. */}
            <button
              type="button"
              aria-expanded={sheetOpen}
              onClick={() => setSheetOpen((o) => !o)}
              className={cx("flex w-full items-center justify-between text-sm font-medium text-zinc-900 lg:hidden dark:text-zinc-100", sheetOpen && "mb-3")}
            >
              {selectedWidget ? `Settings: ${widgetTitle(selectedWidget)}` : "Add a widget"}
              <span aria-hidden className="text-zinc-400">{sheetOpen ? "▾" : "▴"}</span>
            </button>
            <div className={cx(!sheetOpen && "hidden lg:block")}>
              {selectedWidget ? (
                <WidgetSettings
                  key={selectedWidget.id}
                  w={selectedWidget}
                  isFirst={layout[0]?.id === selectedWidget.id}
                  isLast={layout[layout.length - 1]?.id === selectedWidget.id}
                  onChange={(change, rerender) => updateWidget(selectedWidget.id, change, rerender)}
                  onMove={(by) => move(selectedWidget.id, by)}
                  onRemove={() => remove(selectedWidget.id)}
                  onClose={() => setSelected(null)}
                />
              ) : (
                <WidgetLibrary onAdd={add} />
              )}
            </div>
          </aside>
        ) : null}
      </div>
      {/* Room for the bottom sheet on small screens. */}
      {editing ? <div aria-hidden className={cx("lg:hidden", sheetOpen ? "h-[55vh]" : "h-16")} /> : null}
    </div>
  );
}

// --- Grid -----------------------------------------------------------------------------

function WidgetGrid({
  layout,
  nodes,
  stale,
  editing,
  selected,
  onSelect,
  onMove,
  onMoveTo,
  onResize,
  onRemove,
}: {
  layout: Widget[];
  nodes: Record<string, ReactNode>;
  stale: Set<string>;
  editing: boolean;
  selected: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, by: number) => void;
  onMoveTo: (id: string, targetId: string) => void;
  onResize: (id: string, span: Span) => void;
  onRemove: (id: string) => void;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  if (!layout.length) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/50 px-6 py-12 text-center dark:border-zinc-700 dark:bg-transparent">
        <p className="font-medium text-zinc-900 dark:text-zinc-100">{editing ? "Add your first widget" : "This dashboard has no widgets yet"}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">
          {editing ? "Pick one from the panel. Every widget reads the same leads and activities as the rest of Lead Tracker." : "Edit the dashboard to add some."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-12 sm:gap-4">
      {layout.map((w, i) => {
        const node = nodes[w.id];
        const isStale = stale.has(w.id) || !node;
        return (
          <section
            key={w.id}
            id={`widget-${w.id}`}
            aria-label={widgetTitle(w)}
            draggable={editing}
            onDragStart={(e) => {
              setDragging(w.id);
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", w.id);
            }}
            onDragOver={(e) => {
              if (!dragging || dragging === w.id) return;
              e.preventDefault();
              setOver(w.id);
            }}
            onDragLeave={() => setOver((o) => (o === w.id ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              if (dragging) onMoveTo(dragging, w.id);
              setDragging(null);
              setOver(null);
            }}
            onDragEnd={() => {
              setDragging(null);
              setOver(null);
            }}
            onClickCapture={editing ? () => onSelect(w.id) : undefined}
            className={cx(
              "group relative min-w-0",
              w.type === "kpi" ? "col-span-1" : "col-span-2",
              SPAN_CLASS[w.span],
              editing && "cursor-pointer rounded-xl outline-offset-2",
              editing && selected === w.id && "outline-2 outline-accent",
              editing && over === w.id && "outline-2 outline-dashed outline-accent",
              dragging === w.id && "opacity-40",
            )}
          >
            {node ? (
              <div className={cx("h-full transition-opacity duration-300", isStale && "opacity-50")}>{node}</div>
            ) : (
              <div aria-hidden className={cx("animate-pulse rounded-xl bg-white/60 ring-1 ring-hairline dark:bg-zinc-900/60", w.type === "kpi" ? "h-32" : "h-80")} />
            )}
            {editing ? (
              <div
                className={cx(
                  "absolute -top-3 right-3 z-10 items-center gap-0.5 rounded-full bg-white p-0.5 shadow-md ring-1 ring-hairline dark:bg-zinc-800",
                  selected === w.id ? "flex" : "hidden group-hover:flex group-focus-within:flex",
                )}
              >
                <span className="cursor-grab px-1.5 text-zinc-400" title="Drag to move" aria-hidden>⠿</span>
                <ToolButton label="Move earlier" disabled={i === 0} onClick={() => onMove(w.id, -1)}>←</ToolButton>
                <ToolButton label="Move later" disabled={i === layout.length - 1} onClick={() => onMove(w.id, 1)}>→</ToolButton>
                <ToolButton label={`Width ${SPAN_LABEL[w.span]}, change`} onClick={() => onResize(w.id, SPANS[(SPANS.indexOf(w.span) + 1) % SPANS.length]!)}>
                  <span className="px-1 font-mono text-[11px] font-semibold">{SPAN_LABEL[w.span]}</span>
                </ToolButton>
                <ToolButton label="Remove widget" onClick={() => onRemove(w.id)}>✕</ToolButton>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function ToolButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="grid h-7 min-w-7 place-items-center rounded-full text-xs text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-300 dark:hover:bg-zinc-700"
    >
      {children}
    </button>
  );
}

// --- Library ---------------------------------------------------------------------------

const GROUPS = ["Numbers", "Over time", "Breakdowns"] as const;
const SUGGESTIONS = ["Forecast vs goal", "Who's ahead of goal", "Won by source", "Win rate", "Why we lose"];

// Plain keyword matching for "describe a chart": nothing typed here leaves the browser.
function match(text: string): { type: WidgetType; options?: Partial<Widget["options"]> } | null {
  const s = text.toLowerCase();
  const measure = /new|lead|created/.test(s) && !/won|win/.test(s) ? "new_leads" : /how many|count|deals won/.test(s) ? "won_count" : "won_value";
  const split = /source|channel|where|marketing/.test(s) ? "source" : /owner|person|people|rep|who/.test(s) && /time|week|month|by/.test(s) ? "owner" : null;
  if (split) return { type: "trend", options: { measure, split, chart: /line/.test(s) ? "lines" : "columns" } };
  if (/quota|ahead|behind|target|vs goal/.test(s)) return { type: "quota" };
  if (/this quarter|so far/.test(s)) return { type: "kpi", options: { metric: "won_quarter", sparkline: false } };
  if (/forecast|goal|on track|projection/.test(s)) return { type: "forecast" };
  if (/funnel|conversion|how far/.test(s)) return { type: "funnel" };
  if (/lost|lose|why/.test(s)) return { type: "lost_reasons" };
  if (/stage.*(day|long|time)|stuck|slow|velocity|days/.test(s)) return { type: "velocity" };
  if (/stage|pipeline by/.test(s)) return { type: "stages" };
  if (/team|who|people|person|leaderboard|winning/.test(s)) return { type: "team" };
  if (/won and lost|won vs lost|closed/.test(s)) return { type: "won_lost" };
  const metrics: [RegExp, KpiMetric][] = [
    [/win rate/, "win_rate"],
    [/average|avg|deal size/, "avg_deal"],
    [/weighted/, "weighted_value"],
    [/open pipeline|pipeline/, "open_value"],
    [/time to close|close time/, "time_to_close"],
    [/velocity/, "velocity"],
    [/activit|calls|busy/, "activities"],
    [/reply|response/, "median_reply"],
    [/new lead|leads/, "new_leads"],
    [/won|revenue|sales/, "won_value"],
  ];
  const metric = metrics.find(([re]) => re.test(s));
  if (metric) return { type: "kpi", options: { metric: metric[1], sparkline: true } };
  if (/over time|per week|per month|trend/.test(s)) return { type: "trend", options: { measure, split: "none" } };
  return null;
}

function WidgetLibrary({ onAdd }: { onAdd: (type: WidgetType, options?: Partial<Widget["options"]>) => void }) {
  const [text, setText] = useState("");
  const [miss, setMiss] = useState<string | null>(null);
  const ask = (q: string) => {
    const found = match(q);
    if (!found) return setMiss(q);
    setMiss(null);
    setText("");
    onAdd(found.type, found.options);
  };
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Add a widget</h2>
        <p className="text-sm text-zinc-500">It goes at the end; drag it into place.</p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) ask(text.trim());
        }}
        className="flex gap-2"
      >
        <Input aria-label="Describe the widget you want" placeholder="Describe it, e.g. won by owner" value={text} onChange={(e) => setText(e.target.value)} className="h-9" />
        <button type="submit" className={buttonClass("primary", "h-9 px-3.5")}>Add</button>
      </form>
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" onClick={() => ask(s)} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700 hover:bg-accent-soft hover:text-accent-ink dark:bg-zinc-800 dark:text-zinc-300">
            {s}
          </button>
        ))}
      </div>
      {miss ? <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">Couldn&apos;t match “{miss}” to a widget. Try a suggestion, or pick one below.</p> : null}
      {GROUPS.map((g) => (
        <div key={g} className="space-y-1">
          <p className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">{g}</p>
          {(Object.entries(WIDGET_TYPES) as [WidgetType, (typeof WIDGET_TYPES)[WidgetType]][])
            .filter(([, t]) => t.group === g)
            .map(([type, t]) => (
              <button key={type} type="button" onClick={() => onAdd(type)} className="block w-full rounded-xl px-2.5 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800">
                <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.name}</span>
                <span className="block text-xs text-zinc-500">{t.description}</span>
              </button>
            ))}
        </div>
      ))}
    </div>
  );
}

// --- Settings --------------------------------------------------------------------------

function Segmented<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-xs font-medium text-zinc-500">{label}</legend>
      <div className="inline-flex flex-wrap gap-0.5 rounded-full bg-zinc-100 p-0.5 dark:bg-zinc-800">
        {options.map(([v, l]) => (
          <button
            key={String(v)}
            type="button"
            aria-pressed={v === value}
            onClick={() => onChange(v)}
            className={cx(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200",
              v === value ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
            )}
          >
            {l}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function WidgetSettings({
  w,
  isFirst,
  isLast,
  onChange,
  onMove,
  onRemove,
  onClose,
}: {
  w: Widget;
  isFirst: boolean;
  isLast: boolean;
  onChange: (change: Partial<Widget>, rerender: boolean) => void;
  onMove: (by: number) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(w.title ?? "");
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate font-display text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{widgetTitle(w)}</h2>
          <p className="text-sm text-zinc-500">{WIDGET_TYPES[w.type].name}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Back to the widget list" className="grid size-8 shrink-0 place-items-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          ✕
        </button>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-zinc-500">Title</span>
        <Input
          value={title}
          maxLength={80}
          placeholder={widgetTitle({ ...w, title: undefined })}
          onChange={(e) => {
            setTitle(e.target.value);
            onChange({ title: e.target.value.trim() || undefined }, true);
          }}
          className="h-9"
        />
      </label>

      <Segmented label="Width" value={w.span} options={SPANS.map((s) => [s, SPAN_LABEL[s]])} onChange={(span) => onChange({ span }, false)} />

      {w.type === "kpi" ? (
        <>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-zinc-500">Number</span>
            <Select value={w.options.metric} onChange={(e) => onChange({ options: { ...w.options, metric: e.target.value as KpiMetric } }, true)} className="h-9">
              {Object.entries(KPI_METRICS).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </Select>
          </label>
          {w.options.metric === "won_quarter" ? null : (
            <Segmented label="Trend line" value={w.options.sparkline ? "on" : "off"} options={[["on", "Show"], ["off", "Hide"]]} onChange={(v) => onChange({ options: { ...w.options, sparkline: v === "on" } }, true)} />
          )}
        </>
      ) : null}

      {w.type === "forecast" ? (
        <>
          <Segmented label="Likely range" value={w.options.range ? "on" : "off"} options={[["on", "Show"], ["off", "Hide"]]} onChange={(v) => onChange({ options: { ...w.options, range: v === "on" } }, true)} />
          <Segmented label="Previous quarter" value={w.options.previous ? "on" : "off"} options={[["on", "Show"], ["off", "Hide"]]} onChange={(v) => onChange({ options: { ...w.options, previous: v === "on" } }, true)} />
        </>
      ) : null}

      {w.type === "trend" ? (
        <>
          <Segmented label="Measure" value={w.options.measure} options={Object.entries(TREND_MEASURES) as [typeof w.options.measure, string][]} onChange={(measure) => onChange({ options: { ...w.options, measure } }, true)} />
          <Segmented label="Split by" value={w.options.split} options={[["source", "Source"], ["owner", "Owner"], ["none", "Nothing"]]} onChange={(split) => onChange({ options: { ...w.options, split } }, true)} />
          <Segmented label="Draw as" value={w.options.chart} options={[["columns", "Columns"], ["lines", "Lines"]]} onChange={(chart) => onChange({ options: { ...w.options, chart } }, true)} />
        </>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <button type="button" disabled={isFirst} onClick={() => onMove(-1)} className={buttonClass("secondary", "h-8 px-3 text-xs")}>← Earlier</button>
        <button type="button" disabled={isLast} onClick={() => onMove(1)} className={buttonClass("secondary", "h-8 px-3 text-xs")}>Later →</button>
        <button type="button" onClick={onRemove} className={buttonClass("danger", "ml-auto h-8 px-3 text-xs")}>Remove</button>
      </div>
    </div>
  );
}

// --- Header bits -----------------------------------------------------------------------

function SaveStatus({ state }: { state: SaveState }) {
  if (state.status === "error") return <span role="alert" className="text-sm text-red-600 dark:text-red-400">{state.message}</span>;
  return (
    <span aria-live="polite" className="text-sm text-zinc-500">
      {state.status === "saving" ? "Saving…" : state.status === "saved" ? "Saved" : ""}
    </span>
  );
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [asking, setAsking] = useState(false);
  if (!asking) return <button type="button" className={buttonClass("danger")} onClick={() => setAsking(true)}>Delete</button>;
  return (
    <span className="flex items-center gap-1 rounded-full bg-red-50 py-1 pr-1 pl-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
      Delete this dashboard?
      <button type="button" className="rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700" onClick={onDelete}>Delete</button>
      <button type="button" className="rounded-full px-2 py-1 text-xs hover:bg-red-100 dark:hover:bg-red-900" onClick={() => setAsking(false)}>Cancel</button>
    </span>
  );
}

function NewDashboardMenu({ onCreate, disabled }: { onCreate: (template?: string) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" disabled={disabled} aria-expanded={open} onClick={() => setOpen((o) => !o)} className={buttonClass("secondary")}>
        New dashboard
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 z-20 mt-2 w-64 rounded-2xl bg-white p-1.5 shadow-lg ring-1 ring-hairline dark:bg-zinc-900">
          <button role="menuitem" type="button" className="block w-full rounded-xl px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800" onClick={() => { setOpen(false); onCreate(); }}>
            <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">Blank</span>
            <span className="block text-xs text-zinc-500">Start empty and add widgets</span>
          </button>
          {Object.entries(TEMPLATES).map(([key, t]) => (
            <button key={key} role="menuitem" type="button" className="block w-full rounded-xl px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800" onClick={() => { setOpen(false); onCreate(key); }}>
              <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">From “{t.name}”</span>
              <span className="block text-xs text-zinc-500">A private copy you can change</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DeletedToast({ id }: { id: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div role="status" className="flex items-center gap-3 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900">
      <span className="flex-1">
        <b className="font-medium">Dashboard deleted.</b> {error}
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await restoreDashboard(id);
            if (result.error) setError(result.error);
            else router.push(`/reports/${id}`);
          })
        }
        className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium hover:bg-white/25 dark:bg-zinc-900/10"
      >
        {pending ? "Undoing…" : "Undo"}
      </button>
      <button type="button" onClick={() => router.replace(pathname)} aria-label="Dismiss" className="text-white/60 hover:text-white dark:text-zinc-500">
        ✕
      </button>
    </div>
  );
}

// --- URL helpers -----------------------------------------------------------------------

function withParams(pathname: string, current: URLSearchParams, changes: Record<string, string | null>) {
  const params = new URLSearchParams(current);
  for (const [k, v] of Object.entries(changes)) {
    if (v === null) params.delete(k);
    else params.set(k, v);
  }
  return `${pathname}?${params}`;
}

// The URL's filters merged into the saved ones, or null when the URL sets none.
function filtersFromUrl(sp: URLSearchParams, saved: DashboardFilters): DashboardFilters | null {
  const keys = ["period", "from", "to", "owner", "source", "compare"] as const;
  if (!keys.some((k) => sp.has(k))) return null;
  const next: DashboardFilters = { ...saved };
  if (sp.has("period")) {
    next.period = sp.get("period")!;
    if (next.period === "custom") {
      next.from = sp.get("from") ?? undefined;
      next.to = sp.get("to") ?? undefined;
    } else {
      delete next.from;
      delete next.to;
    }
  }
  for (const k of ["owner", "source"] as const) {
    if (!sp.has(k)) continue;
    const v = sp.get(k)!;
    if (v && v !== "all") next[k] = v;
    else delete next[k];
  }
  if (sp.has("compare")) next.compare = sp.get("compare") === "1";
  return next;
}
