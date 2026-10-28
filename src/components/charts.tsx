"use client";

import { useState, type ReactNode } from "react";
import { cx } from "@/components/ui";

// Small, dependency-free charts. Follow the dataviz rules: thin bars with 4px
// rounded data ends, hairline grid, one accent hue (+ muted gray for context),
// values in text colors (never the series color), hover/focus tooltips, and a
// table view for every chart.

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

export type Series = { key: string; label: string; color: "accent" | "muted"; values: number[] };

function niceMax(max: number) {
  if (max <= 0) return 1;
  const step = 10 ** Math.floor(Math.log10(max));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * step >= max) return m * step;
  return 10 * step;
}

// Plain data so it can be passed from a server component.
export type ValueFormat = { kind: "number" } | { kind: "money"; currency: string };

function formatter(f: ValueFormat) {
  if (f.kind === "number") return (n: number) => compact.format(n);
  const money = new Intl.NumberFormat("en", { style: "currency", currency: f.currency, notation: "compact", maximumFractionDigits: 1 });
  return (n: number) => money.format(n);
}

export function ColumnChart({
  labels,
  series,
  valueFormat = { kind: "number" },
}: {
  labels: string[];
  series: Series[];
  valueFormat?: ValueFormat;
}) {
  const format = formatter(valueFormat);
  const [active, setActive] = useState<number | null>(null);
  const counts = valueFormat.kind === "number";
  // Counts get whole-number ticks only.
  const max = Math.max(niceMax(Math.max(0, ...series.flatMap((s) => s.values))), counts ? 2 : 0);
  const ticks = [0, max / 2, max].filter((t) => !counts || Number.isInteger(t));
  // Thin out x labels so they never collide.
  const every = Math.max(1, Math.ceil(labels.length / 8));
  const color = (c: Series["color"]) => (c === "accent" ? "var(--viz-accent)" : "var(--viz-muted)");

  return (
    <div>
      {series.length > 1 ? (
        <ul className="mb-3 flex flex-wrap gap-4 text-xs text-zinc-600 dark:text-zinc-400" aria-label="Legend">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-[2px]" style={{ background: color(s.color) }} />
              {s.label}
            </li>
          ))}
        </ul>
      ) : null}
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
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              aria-label={`${label}: ${series.map((s) => `${s.label} ${format(s.values[i] ?? 0)}`).join(", ")}`}
              className={cx("relative flex h-full min-w-0 flex-1 items-end justify-center gap-[2px] px-[1px] outline-none", active === i && "bg-zinc-100/70 dark:bg-zinc-800/50")}
            >
              {series.map((s) => {
                const v = s.values[i] ?? 0;
                return (
                  <span
                    key={s.key}
                    className="block w-full rounded-t-[4px]"
                    style={{ height: `${(v / max) * 100}%`, maxWidth: 24, minHeight: v ? 2 : 0, background: color(s.color) }}
                  />
                );
              })}
              {active === i ? (
                <div
                  role="tooltip"
                  className={cx(
                    "pointer-events-none absolute bottom-full z-10 mb-1 min-w-32 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs shadow-md dark:border-zinc-800 dark:bg-zinc-900",
                    i > labels.length / 2 ? "right-0" : "left-0",
                  )}
                >
                  <p className="mb-1 text-zinc-500">{label}</p>
                  {series.map((s) => (
                    <p key={s.key} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5 text-zinc-500">
                        <span aria-hidden className="h-0.5 w-3 rounded" style={{ background: color(s.color) }} />
                        {s.label}
                      </span>
                      <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">{format(s.values[i] ?? 0)}</span>
                    </p>
                  ))}
                </div>
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

// --- Stat tile -------------------------------------------------------------------------

export function StatTile({
  label,
  value,
  delta,
  note,
}: {
  label: string;
  value: string;
  // Change vs the previous period; `good` says whether this direction is good news.
  delta?: { text: string; good: boolean | null } | null;
  note?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
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
    </div>
  );
}
