"use client";

import Link from "next/link";
import { createContext, use, useEffect, useEffectEvent, useRef, useState, useTransition, type ComponentProps, type ReactNode } from "react";
import { BarList, BulletList, ColumnChart, StatTile, type BarRow, type BulletRow } from "@/components/charts";
import { StageBadge } from "@/components/ui";
import type { DrillRequest } from "@/lib/dashboards";
import { drillLeads, type DrillResult } from "./actions";

// Clicking a number on a dashboard opens a sheet listing the leads behind it.
// Widgets are server components, so they hand the client wrappers below plain
// request objects; the wrappers turn clicks into those requests.

const DrillContext = createContext<((request: DrillRequest) => void) | null>(null);

// `enabled` is off in edit mode, where a click selects the widget instead.
export function DrillProvider({ enabled, currency, children }: { enabled: boolean; currency: string; children: ReactNode }) {
  const [request, setRequest] = useState<DrillRequest | null>(null);
  const [result, setResult] = useState<DrillResult | null>(null);
  const [loading, startLoading] = useTransition();
  const opener = useRef<HTMLElement | null>(null);

  const open = (next: DrillRequest) => {
    opener.current = document.activeElement as HTMLElement | null;
    setRequest(next);
    setResult(null);
    startLoading(async () => setResult(await drillLeads(next)));
  };
  const close = () => {
    setRequest(null);
    opener.current?.focus();
  };

  return (
    <DrillContext value={enabled ? open : null}>
      {children}
      {request ? <DrillSheet request={request} result={result} loading={loading} currency={currency} onClose={close} /> : null}
    </DrillContext>
  );
}

function DrillSheet({ request, result, loading, currency, onClose }: { request: DrillRequest; result: DrillResult | null; loading: boolean; currency: string; onClose: () => void }) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const money = new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 });
  const onKey = useEffectEvent((e: KeyboardEvent) => e.key === "Escape" && onClose());
  useEffect(() => {
    closeButton.current?.focus();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const rows = result?.rows ?? [];
  return (
    <>
      <div aria-hidden className="fixed inset-0 z-40 bg-zinc-950/30 dark:bg-black/50" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={request.title}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl ring-1 ring-hairline dark:bg-zinc-900"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 pt-5 pb-4 dark:border-zinc-800">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-wider text-accent-ink uppercase">{request.eyebrow}</p>
            <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-balance text-zinc-900 dark:text-zinc-100">{request.title}</h2>
            <p className="mt-1 text-sm text-zinc-500" aria-live="polite">
              {result?.count !== undefined ? `${result.count} lead${result.count === 1 ? "" : "s"} · ${money.format(result.value ?? 0)}` : loading ? "Finding the leads…" : null}
            </p>
          </div>
          <button ref={closeButton} type="button" onClick={onClose} aria-label="Close" className="grid size-9 shrink-0 place-items-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5">
          {result?.error ? (
            <p role="alert" className="py-6 text-sm text-red-600 dark:text-red-400">{result.error}</p>
          ) : !result ? (
            <ul aria-hidden className="space-y-3 py-4">
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className="h-12 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
              ))}
            </ul>
          ) : rows.length ? (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rows.map((r) => (
                <li key={r.id}>
                  <Link href={r.href} className="-mx-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 rounded-lg px-2 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
                    <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">{r.title}</span>
                    <span className="text-right font-medium tabular-nums text-zinc-900 dark:text-zinc-100">{money.format(r.value)}</span>
                    <span className="truncate text-xs text-zinc-500">{r.detail}</span>
                    <span className="justify-self-end">
                      <StageBadge stage={r.stage} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-sm text-zinc-500">No leads here.</p>
          )}
        </div>
        <p className="border-t border-zinc-100 px-5 py-3 text-xs text-zinc-500 dark:border-zinc-800">
          {result?.count && result.count > rows.length ? `Showing the ${rows.length} largest. ` : ""}
          Open deals open in their Inbox thread.
        </p>
      </aside>
    </>
  );
}

// --- Drillable wrappers ----------------------------------------------------------------

export function DrillStatTile({ request, ...props }: ComponentProps<typeof StatTile> & { request?: DrillRequest }) {
  const open = use(DrillContext);
  return <StatTile {...props} onSelect={open && request ? () => open(request) : undefined} />;
}

// Requests are keyed by row key.
export function DrillBarList({ requests, ...props }: ComponentProps<typeof BarList> & { requests: Record<string, DrillRequest> }) {
  const open = use(DrillContext);
  return <BarList {...props} onSelect={open ? (row: BarRow) => requests[row.key] && open(requests[row.key]!) : undefined} />;
}

export function DrillBulletList({ requests, ...props }: ComponentProps<typeof BulletList> & { requests: Record<string, DrillRequest> }) {
  const open = use(DrillContext);
  return <BulletList {...props} onSelect={open ? (row: BulletRow) => requests[row.key] && open(requests[row.key]!) : undefined} />;
}

// Requests are keyed "index:seriesKey" for a segment and "index" for the whole column.
export function DrillColumnChart({ requests, ...props }: Omit<ComponentProps<typeof ColumnChart>, "onSelect"> & { requests: Record<string, DrillRequest> }) {
  const open = use(DrillContext);
  return (
    <ColumnChart
      {...props}
      onSelect={
        open
          ? (i, key) => {
              const request = (key && requests[`${i}:${key}`]) || requests[String(i)];
              if (request) open(request);
            }
          : undefined
      }
    />
  );
}

export function DrillButton({ request, className, children }: { request: DrillRequest; className?: string; children: ReactNode }) {
  const open = use(DrillContext);
  if (!open) return <span className={className}>{children}</span>;
  return (
    <button type="button" onClick={() => open(request)} className={`${className ?? ""} cursor-pointer text-left decoration-zinc-300 underline-offset-4 hover:underline dark:decoration-zinc-600`}>
      {children}
    </button>
  );
}
