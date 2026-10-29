"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/components/ui";

// Small, dependency-free charts. Follow the dataviz rules: thin bars with 4px
// rounded data ends, hairline grid, one accent hue (+ muted gray for context)
// or the fixed categorical slots when series need identity, values in text
// colors (never the series color), hover/focus tooltips, and a table view for
// every chart.

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

// --- Card with chart/table toggle --------------------------------------------------

export function ChartCard({
  title,
  description,
  actions,
  table,
  children,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  table?: ReactNode;
  children: ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <figure className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <figcaption className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-medium text-zinc-900 dark:text-zinc-100">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-zinc-500">{description}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {actions}
          {table ? (
            <button
              type="button"
              onClick={() => setShowTable((v) => !v)}
              aria-pressed={showTable}
              className="rounded-md px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              {showTable ? "Show chart" : "Show table"}
            </button>
          ) : null}
        </div>
      </figcaption>
      {showTable ? <div className="overflow-x-auto">{table}</div> : children}
    </figure>
  );
}

export function DataTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800">
        <tr>
          {head.map((h, i) => (
            <th key={h} scope="col" className={cx("py-2 pr-3 font-medium", i > 0 && "text-right")}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-100 tabular-nums dark:divide-zinc-900">
        {rows.map((row, r) => (
          <tr key={r}>
            {row.map((cell, i) => (
              <td key={i} className={cx("py-1.5 pr-3", i > 0 ? "text-right text-zinc-600 dark:text-zinc-400" : "text-zinc-900 dark:text-zinc-100")}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// --- Horizontal bars (one series) ----------------------------------------------------

export type BarRow = { key: string; label: string; value: number; display: string; detail?: string };

export function BarList({ rows, empty = "No data for this period." }: { rows: BarRow[]; empty?: string }) {
  const [active, setActive] = useState<string | null>(null);
  if (!rows.length) return <p className="py-6 text-center text-sm text-zinc-500">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <ul className="space-y-1">
      {rows.map((row) => {
        const pct = (row.value / max) * 100;
        const on = active === row.key;
        return (
          <li
            key={row.key}
            tabIndex={0}
            onPointerEnter={() => setActive(row.key)}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive(row.key)}
            onBlur={() => setActive(null)}
            aria-label={`${row.label}: ${row.display}${row.detail ? `, ${row.detail}` : ""}`}
            className={cx(
              "relative grid grid-cols-[minmax(5rem,9rem)_1fr_6.5rem] items-center gap-3 rounded-md px-1 py-1 outline-none",
              on && "bg-zinc-50 dark:bg-zinc-900",
            )}
          >
            <span className="truncate text-sm text-zinc-700 dark:text-zinc-300" title={row.label}>
              {row.label}
            </span>
            {/* Same-width track on every row keeps bar lengths comparable. */}
            <span className="min-w-0">
              <span
                className="block h-3 rounded-r-[4px]"
                style={{ width: `${Math.max(pct, row.value ? 1 : 0)}%`, background: "var(--viz-accent)", opacity: active && !on ? 0.55 : 1 }}
              />
            </span>
            <span className="truncate text-sm tabular-nums text-zinc-900 dark:text-zinc-100">{row.display}</span>
            {on && row.detail ? (
              <span role="tooltip" className="pointer-events-none absolute top-full right-1 z-10 mt-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-600 shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                {row.detail}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

// --- Columns over time ---------------------------------------------------------------

// "accent" and "muted" for one measure plus context; 1–6 are the categorical
// slots, for series that need an identity (a source, a person).
export type SeriesColor = "accent" | "muted" | 1 | 2 | 3 | 4 | 5 | 6;
export type Series = { key: string; label: string; color: SeriesColor; values: number[] };

export const seriesColor = (c: SeriesColor) => (c === "accent" ? "var(--viz-accent)" : c === "muted" ? "var(--viz-muted)" : `var(--viz-${c})`);

function niceMax(max: number) {
  if (max <= 0) return 1;
  const step = 10 ** Math.floor(Math.log10(max));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * step >= max) return m * step;
  return 10 * step;
}

// Plain data so it can be passed from a server component.
export type ValueFormat = { kind: "number" } | { kind: "money"; currency: string } | { kind: "hours" };

function formatter(f: ValueFormat) {
  if (f.kind === "number") return (n: number) => compact.format(n);
  if (f.kind === "hours") return (n: number) => (n < 1 ? `${Math.round(n * 60)} min` : `${compact.format(n)} h`);
  const money = new Intl.NumberFormat("en", { style: "currency", currency: f.currency, notation: "compact", maximumFractionDigits: 1 });
  return (n: number) => money.format(n);
}

function ticksFor(max: number, counts: boolean) {
  return [0, max / 2, max].filter((t) => !counts || Number.isInteger(t));
}

function Legend({ series }: { series: Series[] }) {
  return (
    <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400" aria-label="Legend">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-[2px]" style={{ background: seriesColor(s.color) }} />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

function SeriesTooltip({ title, series, index, format, total, hint, align }: {
  title: string;
  series: Series[];
  index: number;
  format: (n: number) => string;
  total?: number;
  hint?: string;
  align: "left" | "right";
}) {
  return (
    <div
      role="tooltip"
      className={cx(
        "pointer-events-none absolute bottom-full z-10 mb-1 min-w-32 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs shadow-md dark:border-zinc-800 dark:bg-zinc-900",
        align === "right" ? "right-0" : "left-0",
      )}
    >
      <p className="mb-1 whitespace-nowrap text-zinc-500">{title}</p>
      {series.map((s) => (
        <p key={s.key} className="flex items-center justify-between gap-3 whitespace-nowrap">
          <span className="flex items-center gap-1.5 text-zinc-500">
            <span aria-hidden className="h-0.5 w-3 rounded" style={{ background: seriesColor(s.color) }} />
            {s.label}
          </span>
          <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">{format(s.values[index] ?? 0)}</span>
        </p>
      ))}
      {total !== undefined ? (
        <p className="mt-1 flex justify-between gap-3 border-t border-zinc-100 pt-1 text-zinc-500 dark:border-zinc-800">
          Total <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">{format(total)}</span>
        </p>
      ) : null}
      {hint ? <p className="mt-1 text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export function ColumnChart({
  labels,
  series,
  valueFormat = { kind: "number" },
  stacked = false,
  onSelect,
}: {
  labels: string[];
  series: Series[];
  valueFormat?: ValueFormat;
  // Stack the series in one column per label (identity per segment) instead of side by side.
  stacked?: boolean;
  // Called with the column and, when a segment was clicked, its series key.
  onSelect?: (index: number, seriesKey: string | null) => void;
}) {
  const format = formatter(valueFormat);
  const [active, setActive] = useState<number | null>(null);
  const counts = valueFormat.kind === "number";
  const totals = labels.map((_, i) => series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0));
  // Counts get whole-number ticks only.
  const max = Math.max(niceMax(stacked ? Math.max(0, ...totals) : Math.max(0, ...series.flatMap((s) => s.values))), counts ? 2 : 0);
  const ticks = ticksFor(max, counts);
  // Thin out x labels so they never collide.
  const every = Math.max(1, Math.ceil(labels.length / 8));

  return (
    <div>
      {series.length > 1 ? <Legend series={series} /> : null}
      <div className="relative h-44 pl-9">
        {ticks.map((t) => (
          <div key={t} className="absolute right-0 left-9 border-t" style={{ bottom: `${(t / max) * 100}%`, borderColor: t === 0 ? "var(--viz-axis)" : "var(--viz-grid)" }}>
            <span className="absolute -top-2 -left-9 w-8 text-right text-[11px] tabular-nums text-zinc-500">{format(t)}</span>
          </div>
        ))}
        <div className="absolute inset-0 left-9 flex items-end">
          {labels.map((label, i) => (
            <div
              key={label + i}
              tabIndex={0}
              role={onSelect ? "button" : undefined}
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              onClick={onSelect ? (e) => onSelect(i, (e.target as HTMLElement).dataset.series ?? null) : undefined}
              onKeyDown={onSelect ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(i, null); } } : undefined}
              aria-label={`${label}: ${series.map((s) => `${s.label} ${format(s.values[i] ?? 0)}`).join(", ")}`}
              className={cx(
                "relative flex h-full min-w-0 flex-1 items-end justify-center gap-[2px] px-[1px] outline-none",
                active === i && "bg-zinc-100/70 dark:bg-zinc-800/50",
                onSelect && "cursor-pointer",
              )}
            >
              {stacked ? (
                <StackedColumn series={series} index={i} max={max} />
              ) : (
                series.map((s) => {
                  const v = s.values[i] ?? 0;
                  return (
                    <span
                      key={s.key}
                      data-series={s.key}
                      className="block w-full rounded-t-[4px]"
                      style={{ height: `${(v / max) * 100}%`, maxWidth: 24, minHeight: v ? 2 : 0, background: seriesColor(s.color) }}
                    />
                  );
                })
              )}
              {active === i ? (
                <SeriesTooltip
                  title={label}
                  series={stacked ? [...series].reverse() : series}
                  index={i}
                  format={format}
                  total={stacked && series.length > 1 ? totals[i] : undefined}
                  hint={onSelect ? "Click to see the leads" : undefined}
                  align={i > labels.length / 2 ? "right" : "left"}
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>
      <div className="flex pl-9">
        {labels.map((label, i) => (
          <span key={label + i} className="min-w-0 flex-1 truncate pt-1.5 text-center text-[11px] text-zinc-500">
            {i % every === 0 ? label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

// Segments sit on each other with a 2px surface gap; only the top one gets the
// rounded data end.
function StackedColumn({ series, index, max }: { series: Series[]; index: number; max: number }) {
  const drawn = series.map((s) => ({ s, v: s.values[index] ?? 0 })).filter((x) => x.v > 0);
  const below = drawn.map((_, k) => drawn.slice(0, k).reduce((sum, d) => sum + d.v, 0));
  return (
    <span className="relative block h-full w-full" style={{ maxWidth: 24 }}>
      {drawn.map(({ s, v }, k) => {
        const bottom = (below[k]! / max) * 100;
        const height = (v / max) * 100;
        return (
          <span
            key={s.key}
            data-series={s.key}
            className={cx("absolute inset-x-0 block", k === drawn.length - 1 && "rounded-t-[4px]")}
            style={{
              bottom: k ? `calc(${bottom}% + 2px)` : 0,
              height: k ? `max(calc(${height}% - 2px), 1px)` : `max(${height}%, 2px)`,
              background: seriesColor(s.color),
            }}
          />
        );
      })}
    </span>
  );
}

// --- Stat tile -------------------------------------------------------------------------

export function StatTile({
  label,
  value,
  delta,
  note,
  trend,
}: {
  label: string;
  value: string;
  // Change vs the previous period; `good` says whether this direction is good news.
  delta?: { text: string; good: boolean | null } | null;
  note?: string;
  // Values per period bucket, drawn as a sparkline under the number.
  trend?: number[];
}) {
  return (
    <div className="h-full rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{value}</p>
      {delta ? (
        <p
          className={cx(
            "mt-1 text-xs",
            delta.good === true && "text-emerald-700 dark:text-emerald-400",
            delta.good === false && "text-red-700 dark:text-red-400",
            delta.good === null && "text-zinc-500",
          )}
        >
          {delta.text}
        </p>
      ) : note ? (
        <p className="mt-1 text-xs text-zinc-500">{note}</p>
      ) : null}
      {trend && trend.length > 1 ? (
        <div className="mt-3">
          <Sparkline values={trend} />
        </div>
      ) : null}
    </div>
  );
}

// --- Shared bits for SVG charts --------------------------------------------------------

// SVG text must not scale with a viewBox, so SVG charts draw at their real width.
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry!.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

const AXIS_TEXT = "fill-zinc-500 text-[11px] tabular-nums";

// --- Lines over time -------------------------------------------------------------------

export function LineChart({
  labels,
  series,
  valueFormat = { kind: "number" },
  height = 176,
}: {
  labels: string[];
  series: Series[];
  valueFormat?: ValueFormat;
  height?: number;
}) {
  const format = formatter(valueFormat);
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const n = labels.length;
  // Up to four series are labelled at their ends as well as in the legend.
  const endLabels = series.length > 1 && series.length <= 4;
  const ml = 36, mr = endLabels ? 84 : 8, mt = 8, mb = 22;
  const pw = Math.max(1, width - ml - mr), ph = height - mt - mb;
  const counts = valueFormat.kind === "number";
  const max = Math.max(niceMax(Math.max(0, ...series.flatMap((s) => s.values))), counts ? 2 : 0);
  const x = (i: number) => ml + (n > 1 ? (i / (n - 1)) * pw : pw / 2);
  const y = (v: number) => mt + ph - (v / max) * ph;
  const every = Math.max(1, Math.ceil(n / 8));

  const ends = series.map((s) => ({ s, y: y(s.values[n - 1] ?? 0) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i]!.y - ends[i - 1]!.y < 14) ends[i]!.y = ends[i - 1]!.y + 14;
  const overflow = ends.length ? ends[ends.length - 1]!.y - (mt + ph) : 0;
  if (overflow > 0) for (const e of ends) e.y -= overflow;

  const pick = (clientX: number, el: Element) => {
    const r = el.getBoundingClientRect();
    const i = Math.round(((clientX - r.left - ml) / pw) * (n - 1));
    return i >= 0 && i < n ? i : null;
  };

  return (
    <div>
      {series.length > 1 ? <Legend series={series} /> : null}
      <div
        ref={ref}
        className="relative outline-none"
        tabIndex={0}
        aria-label={`Line chart: ${series.map((s) => `${s.label}, latest ${format(s.values[n - 1] ?? 0)}`).join("; ")}`}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") setActive((a) => Math.min(n - 1, (a ?? -1) + 1));
          if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? n) - 1));
        }}
        onBlur={() => setActive(null)}
      >
        {width ? (
          <svg width={width} height={height} className="block overflow-visible" onPointerMove={(e) => setActive(pick(e.clientX, e.currentTarget))} onPointerLeave={() => setActive(null)}>
            {ticksFor(max, counts).map((t) => (
              <g key={t}>
                <line x1={ml} x2={width - mr} y1={y(t)} y2={y(t)} stroke={t ? "var(--viz-grid)" : "var(--viz-axis)"} />
                <text x={ml - 6} y={y(t) + 4} textAnchor="end" className={AXIS_TEXT}>{format(t)}</text>
              </g>
            ))}
            {labels.map((l, i) => (i % every === 0 ? <text key={l + i} x={x(i)} y={height - 4} textAnchor="middle" className={AXIS_TEXT}>{l}</text> : null))}
            {active !== null ? <line x1={x(active)} x2={x(active)} y1={mt} y2={mt + ph} stroke="var(--viz-axis)" /> : null}
            {series.map((s) => (
              <g key={s.key}>
                <polyline points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" stroke={seriesColor(s.color)} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                <circle cx={x(active ?? n - 1)} cy={y(s.values[active ?? n - 1] ?? 0)} r={4} fill={seriesColor(s.color)} className="stroke-white stroke-2 dark:stroke-zinc-950" />
              </g>
            ))}
            {endLabels
              ? ends.map((e) => (
                  <text key={e.s.key} x={x(n - 1) + 10} y={e.y + 4} className="fill-zinc-600 text-[11px] dark:fill-zinc-400">
                    {e.s.label.length > 12 ? `${e.s.label.slice(0, 11)}…` : e.s.label}
                  </text>
                ))
              : null}
          </svg>
        ) : (
          <div style={{ height }} />
        )}
        {active !== null && width ? (
          <div className="absolute top-0" style={{ left: x(active) }}>
            <div className="relative">
              <SeriesTooltip title={labels[active]!} series={series} index={active} format={format} align={active > n / 2 ? "right" : "left"} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// --- Sparkline (inside a stat tile) ------------------------------------------------------

export function Sparkline({ values, color = "accent", height = 40 }: { values: number[]; color?: SeriesColor; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const n = values.length;
  const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
  const x = (i: number) => 4 + (n > 1 ? (i / (n - 1)) * (width - 8) : 0);
  const y = (v: number) => 4 + (1 - (v - lo) / span) * (height - 10);
  const points = values.map((v, i) => `${x(i)},${y(v)}`);
  return (
    <div ref={ref} aria-hidden>
      {width && n ? (
        <svg width={width} height={height} className="block">
          <path d={`M${x(0)},${height - 2}L${points.join("L")}L${x(n - 1)},${height - 2}Z`} fill={seriesColor(color)} opacity={0.1} />
          <polyline points={points.join(" ")} fill="none" stroke={seriesColor(color)} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={x(n - 1)} cy={y(values[n - 1]!)} r={3.5} fill={seriesColor(color)} className="stroke-white stroke-2 dark:stroke-zinc-950" />
        </svg>
      ) : (
        <div style={{ height }} />
      )}
    </div>
  );
}

// --- Heat grid (rows × columns of counts) ----------------------------------------------

// Six steps of one hue; empty cells stay neutral so zero never reads as "a little".
const heatLevel = (v: number, max: number) => (v <= 0 ? 0 : Math.min(6, 1 + Math.floor((v / max) * 5.999)));

export function HeatLegend({ low = "Fewer", high = "More" }: { low?: string; high?: string }) {
  return (
    <div className="mt-3 flex items-center gap-1 text-[11px] text-zinc-500" aria-hidden>
      <span className="mr-1">{low}</span>
      {[1, 2, 3, 4, 5, 6].map((k) => (
        <span key={k} className="h-2.5 w-3.5 rounded-[2px]" style={{ background: `var(--heat-${k})` }} />
      ))}
      <span className="ml-1">{high}</span>
    </div>
  );
}

export type HeatRow = { key: string; label: string; cells: number[] };

export function HeatGrid({
  columns,
  rows,
  cellLabel,
  onSelect,
}: {
  // `flag` marks a column that needs attention (e.g. stale ages), in text as well as color.
  columns: { key: string; label: string; flag?: boolean }[];
  rows: HeatRow[];
  cellLabel: (row: HeatRow, column: number, value: number) => string;
  onSelect?: (row: HeatRow, column: number) => void;
}) {
  const max = Math.max(1, ...rows.flatMap((r) => r.cells));
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[24rem] gap-[3px] text-sm" style={{ gridTemplateColumns: `minmax(5rem, auto) repeat(${columns.length}, minmax(0, 1fr)) 3rem` }}>
        <span />
        {columns.map((c) => (
          <span key={c.key} className={cx("pb-0.5 text-center text-[11px] whitespace-nowrap", c.flag ? "text-amber-700 dark:text-amber-400" : "text-zinc-500")}>
            {c.label}
          </span>
        ))}
        <span className="pb-0.5 text-right text-[11px] text-zinc-500">Total</span>
        {rows.map((row) => (
          <HeatRowCells key={row.key} row={row} max={max} cellLabel={cellLabel} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function HeatRowCells({ row, max, cellLabel, onSelect }: { row: HeatRow; max: number; cellLabel: (row: HeatRow, column: number, value: number) => string; onSelect?: (row: HeatRow, column: number) => void }) {
  return (
    <>
      <span className="flex items-center pr-2 text-zinc-700 dark:text-zinc-300">{row.label}</span>
      {row.cells.map((v, c) => {
        const level = heatLevel(v, max);
        return (
          <button
            key={c}
            type="button"
            disabled={!v || !onSelect}
            onClick={() => onSelect?.(row, c)}
            title={cellLabel(row, c, v)}
            aria-label={cellLabel(row, c, v)}
            className={cx(
              "h-9 rounded-md text-sm font-medium tabular-nums transition-shadow duration-200",
              level ? "enabled:cursor-pointer enabled:hover:ring-2 enabled:hover:ring-zinc-900 enabled:hover:ring-offset-2 dark:enabled:hover:ring-zinc-100 dark:ring-offset-zinc-950" : "bg-zinc-50 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600",
            )}
            style={level ? { background: `var(--heat-${level})`, color: `var(--heat-ink-${level})` } : undefined}
          >
            {v || "·"}
          </button>
        );
      })}
      <span className="flex items-center justify-end tabular-nums text-zinc-500">{row.cells.reduce((a, b) => a + b, 0)}</span>
    </>
  );
}

// --- Calendar heat (one cell per day, weeks as columns) --------------------------------

const DOW = ["Mon", "", "Wed", "", "Fri", "", ""];

export function CalendarHeat({ days, unit = "activities" }: { days: { date: string; count: number }[]; unit?: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  if (!days.length) return null;
  // Monday-first weeks; the first column may start part-way through a week.
  const offset = (new Date(`${days[0]!.date}T00:00:00Z`).getUTCDay() + 6) % 7;
  const weeks = Math.ceil((days.length + offset) / 7);
  const ml = 30, mt = 18, gap = 3;
  const cell = Math.max(8, Math.min(24, Math.floor((width - ml) / weeks) - gap));
  const max = Math.max(1, ...days.map((d) => d.count));
  const pos = (i: number) => ({ col: Math.floor((i + offset) / 7), row: (i + offset) % 7 });
  const monthLabel = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en", { month: "short", timeZone: "UTC" });
  const dayLabel = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  const height = mt + 7 * (cell + gap);
  const months = days.map((d) => monthLabel(d.date));
  // A month label goes over the first week column that starts in that month.
  const showMonth = (i: number) => i === 0 || (pos(i).row === 0 && months[i] !== months[Math.max(0, i - 7)]);

  return (
    <div ref={ref} className="relative">
      {width ? (
        <svg width={width} height={height} role="img" aria-label={`${days.reduce((a, d) => a + d.count, 0)} ${unit} over ${weeks} weeks`} onPointerLeave={() => setActive(null)}>
          {DOW.map((l, r) => (l ? <text key={r} x={0} y={mt + r * (cell + gap) + cell / 2 + 4} className={AXIS_TEXT}>{l}</text> : null))}
          {days.map((d, i) => {
            const { col, row } = pos(i);
            const level = heatLevel(d.count, max);
            return (
              <g key={d.date}>
                {showMonth(i) ? <text x={ml + col * (cell + gap)} y={11} className={AXIS_TEXT}>{months[i]}</text> : null}
                <rect
                  x={ml + col * (cell + gap)}
                  y={mt + row * (cell + gap)}
                  width={cell}
                  height={cell}
                  rx={Math.min(4, cell / 4)}
                  fill={level ? `var(--heat-${level})` : "var(--color-zinc-100)"}
                  className={level ? undefined : "dark:[fill:var(--color-zinc-900)]"}
                  onPointerEnter={() => setActive(i)}
                />
              </g>
            );
          })}
        </svg>
      ) : (
        <div style={{ height: 160 }} />
      )}
      {active !== null && width ? (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs whitespace-nowrap shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          style={{ left: Math.min(width - 140, ml + pos(active).col * (cell + gap)), top: mt + (pos(active).row + 1) * (cell + gap) + 2 }}
        >
          <p className="text-zinc-500">{dayLabel(days[active]!.date)}</p>
          <p className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
            {days[active]!.count} {unit}
          </p>
        </div>
      ) : null}
      <HeatLegend />
    </div>
  );
}

// --- Bullet list (value + forecast against a target) -----------------------------------

export type BulletRow = { key: string; label: string; value: number; forecast?: number; target: number; display: string; detail?: string };

export function BulletList({ rows, onSelect }: { rows: BulletRow[]; onSelect?: (row: BulletRow) => void }) {
  const max = Math.max(1, ...rows.map((r) => Math.max(r.target, r.value + (r.forecast ?? 0)))) * 1.05;
  const hasForecast = rows.some((r) => r.forecast);
  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400" aria-label="Legend">
        <li className="flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-[2px]" style={{ background: "var(--viz-1)" }} />Won</li>
        {hasForecast ? <li className="flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-[2px]" style={{ background: "color-mix(in srgb, var(--viz-1) 30%, transparent)" }} />Forecast</li> : null}
        <li className="flex items-center gap-1.5"><span aria-hidden className="h-3 w-0.5 rounded-[1px] bg-zinc-900 dark:bg-zinc-100" />Goal</li>
      </ul>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.key}>
            <button
              type="button"
              onClick={onSelect ? () => onSelect(r) : undefined}
              disabled={!onSelect}
              aria-label={`${r.label}: ${r.display}${r.detail ? `, ${r.detail}` : ""}`}
              className="grid w-full grid-cols-[minmax(5rem,9rem)_1fr_auto] items-center gap-3 rounded-md px-1 py-1 text-left enabled:hover:bg-zinc-50 dark:enabled:hover:bg-zinc-900"
            >
              <span className="truncate text-sm text-zinc-700 dark:text-zinc-300">{r.label}</span>
              <span className="relative block h-5 min-w-0">
                <span className="absolute top-1 left-0 h-3 rounded-r-[4px]" style={{ width: `${(r.value / max) * 100}%`, background: "var(--viz-1)" }} />
                {r.forecast ? (
                  <span
                    className="absolute top-1 h-3 rounded-r-[4px]"
                    style={{ left: `calc(${(r.value / max) * 100}% + 2px)`, width: `${(r.forecast / max) * 100}%`, background: "color-mix(in srgb, var(--viz-1) 30%, transparent)" }}
                  />
                ) : null}
                <span className="absolute inset-y-0 w-0.5 rounded-[1px] bg-zinc-900 dark:bg-zinc-100" style={{ left: `${(r.target / max) * 100}%` }} />
              </span>
              <span className="text-sm whitespace-nowrap tabular-nums text-zinc-900 dark:text-zinc-100">{r.display}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- Forecast (cumulative won, projection to period end, goal) -------------------------

export function ForecastChart({
  start,
  actual,
  projection,
  low,
  high,
  previous,
  goal,
  valueFormat,
  height = 240,
}: {
  // Day 0 of the period (YYYY-MM-DD). Arrays are cumulative values per day.
  start: string;
  // Won so far: day 0 through today.
  actual: number[];
  // Today through the last day of the period (projection[0] equals the last actual value).
  projection: number[];
  low?: number[];
  high?: number[];
  // The previous period, same day offsets, for comparison.
  previous?: number[];
  goal?: number;
  valueFormat: ValueFormat;
  height?: number;
}) {
  const format = formatter(valueFormat);
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const today = actual.length - 1;
  const days = today + projection.length - 1;
  const ml = 44, mr = 88, mt = 16, mb = 22;
  const pw = Math.max(1, width - ml - mr), ph = height - mt - mb;
  const max = niceMax(Math.max(goal ? goal * 1.08 : 0, ...(high ?? projection), ...(previous ?? []), ...actual));
  const x = (i: number) => ml + (i / Math.max(1, days)) * pw;
  const y = (v: number) => mt + ph - (v / max) * ph;
  const path = (values: number[], from = 0) => values.map((v, k) => `${k ? "L" : "M"}${x(k + from)},${y(v)}`).join("");
  const dayDate = (i: number) => new Date(Date.parse(`${start}T00:00:00Z`) + i * 864e5);
  const months: { i: number; label: string }[] = [];
  for (let i = 0; i <= days; i++) {
    const d = dayDate(i);
    if (i === 0 || d.getUTCDate() === 1) months.push({ i, label: d.toLocaleDateString("en", { month: "short", timeZone: "UTC" }) });
  }
  const won = actual[today] ?? 0;
  const end = projection[projection.length - 1] ?? won;
  const goalY = goal ? y(goal) : null;
  let endY = y(end) + 4;
  if (goalY !== null && Math.abs(endY - (goalY + 4)) < 16) endY = goalY + (end > (goal ?? 0) ? -12 : 20);
  const value = (i: number) => (i <= today ? actual[i]! : projection[i - today]!);

  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400" aria-label="Legend">
        <li className="flex items-center gap-1.5"><span aria-hidden className="h-0.5 w-3.5 rounded" style={{ background: "var(--viz-1)" }} />Won so far</li>
        <li className="flex items-center gap-1.5"><span aria-hidden className="w-3.5 border-t-2 border-dashed" style={{ borderColor: "var(--viz-1)" }} />Forecast</li>
        {low && high ? <li className="flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-[2px]" style={{ background: "color-mix(in srgb, var(--viz-1) 16%, transparent)" }} />Likely range</li> : null}
        {previous ? <li className="flex items-center gap-1.5"><span aria-hidden className="h-0.5 w-3.5 rounded" style={{ background: "var(--viz-muted)" }} />Previous period</li> : null}
        {goal ? <li className="flex items-center gap-1.5"><span aria-hidden className="h-3 w-0.5 rounded-[1px] bg-zinc-900 dark:bg-zinc-100" />Goal</li> : null}
      </ul>
      <div ref={ref} className="relative">
        {width ? (
          <svg
            width={width}
            height={height}
            className="block overflow-visible"
            role="img"
            aria-label={`${format(won)} won so far, ${format(end)} forecast${goal ? ` against a ${format(goal)} goal` : ""}`}
            onPointerMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const i = Math.round(((e.clientX - r.left - ml) / pw) * days);
              setActive(i >= 0 && i <= days ? i : null);
            }}
            onPointerLeave={() => setActive(null)}
          >
            {[0, max / 2, max].map((t) => (
              <g key={t}>
                <line x1={ml} x2={width - mr} y1={y(t)} y2={y(t)} stroke={t ? "var(--viz-grid)" : "var(--viz-axis)"} />
                <text x={ml - 6} y={y(t) + 4} textAnchor="end" className={AXIS_TEXT}>{format(t)}</text>
              </g>
            ))}
            {months.map((m) => <text key={m.i} x={x(m.i)} y={height - 4} className={AXIS_TEXT}>{m.label}</text>)}
            {low && high ? <path d={`${path(high, today)}L${[...low].reverse().map((v, k) => `${x(days - k)},${y(v)}`).join("L")}Z`} fill="var(--viz-1)" opacity={0.12} /> : null}
            {previous ? <path d={path(previous)} fill="none" stroke="var(--viz-muted)" strokeWidth={1.5} strokeLinejoin="round" /> : null}
            {goalY !== null ? (
              <g>
                <line x1={ml} x2={width - mr} y1={goalY} y2={goalY} className="stroke-zinc-900 dark:stroke-zinc-100" />
                <text x={width - mr + 8} y={goalY + 4} className="fill-zinc-900 text-xs font-medium tabular-nums dark:fill-zinc-100">Goal {format(goal!)}</text>
              </g>
            ) : null}
            <path d={`${path(actual)}L${x(today)},${y(0)}L${x(0)},${y(0)}Z`} fill="var(--viz-1)" opacity={0.1} />
            <path d={path(actual)} fill="none" stroke="var(--viz-1)" strokeWidth={2} strokeLinejoin="round" />
            <path d={path(projection, today)} fill="none" stroke="var(--viz-1)" strokeWidth={2} strokeDasharray="5 4" strokeLinejoin="round" />
            <line x1={x(today)} x2={x(today)} y1={mt} y2={mt + ph} stroke="var(--viz-axis)" />
            <text x={x(today) + 6} y={mt + 2} className="fill-zinc-500 text-[11px]">Today</text>
            <circle cx={x(today)} cy={y(won)} r={4.5} fill="var(--viz-1)" className="stroke-white stroke-2 dark:stroke-zinc-950" />
            <text x={x(today) - 8} y={y(won) - 10} textAnchor="end" className="fill-zinc-900 text-xs font-medium tabular-nums dark:fill-zinc-100">{format(won)} won</text>
            <circle cx={x(days)} cy={y(end)} r={4} stroke="var(--viz-1)" strokeWidth={2} className="fill-white dark:fill-zinc-950" />
            <text x={width - mr + 8} y={endY} className="fill-zinc-900 text-xs font-medium tabular-nums dark:fill-zinc-100">{format(end)}</text>
            <text x={width - mr + 8} y={endY + 14} className="fill-zinc-500 text-[11px]">forecast</text>
            {active !== null ? (
              <g>
                <line x1={x(active)} x2={x(active)} y1={mt} y2={mt + ph} stroke="var(--viz-axis)" />
                <circle cx={x(active)} cy={y(value(active))} r={4} fill="var(--viz-1)" className="stroke-white stroke-2 dark:stroke-zinc-950" />
              </g>
            ) : null}
          </svg>
        ) : (
          <div style={{ height }} />
        )}
        {active !== null && width ? (
          <div
            role="tooltip"
            className="pointer-events-none absolute top-0 z-10 min-w-36 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs shadow-md dark:border-zinc-800 dark:bg-zinc-900"
            style={active > days / 2 ? { right: width - x(active) + 8 } : { left: x(active) + 8 }}
          >
            <p className="mb-1 text-zinc-500">{dayDate(active).toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}</p>
            <p className="flex justify-between gap-3">
              <span className="text-zinc-500">{active <= today ? "Won so far" : "Forecast"}</span>
              <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">{format(value(active))}</span>
            </p>
            {active > today && low && high ? (
              <p className="flex justify-between gap-3">
                <span className="text-zinc-500">Range</span>
                <span className="tabular-nums text-zinc-900 dark:text-zinc-100">{format(low[active - today]!)}–{format(high[active - today]!)}</span>
              </p>
            ) : null}
            {previous?.[active] !== undefined ? (
              <p className="flex justify-between gap-3">
                <span className="text-zinc-500">Previous period</span>
                <span className="tabular-nums text-zinc-900 dark:text-zinc-100">{format(previous[active]!)}</span>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
