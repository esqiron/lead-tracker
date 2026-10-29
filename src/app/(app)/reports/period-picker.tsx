"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Input, Select } from "@/components/ui";

// Period presets, plus from/to dates when "Custom range" is picked.
// `defaultPeriod` is what applies with no period in the URL (a dashboard's saved default).
export function PeriodPicker({
  periods,
  from,
  to,
  defaultPeriod = "this_month",
}: {
  periods: readonly { value: string; label: string }[];
  from: string;
  to: string;
  defaultPeriod?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const period = searchParams.get("period") ?? defaultPeriod;

  const set = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(changes)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    startTransition(() => router.replace(`${pathname}?${params}`, { scroll: false }));
  };

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={pending}>
      <Select
        aria-label="Period"
        value={period}
        onChange={(e) => set(e.target.value === "custom" ? { period: "custom", from, to } : { period: e.target.value === defaultPeriod ? null : e.target.value, from: null, to: null })}
        className="h-9 w-auto min-w-40"
      >
        {periods.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </Select>
      {period === "custom" ? (
        <>
          <Input type="date" aria-label="From" defaultValue={from} max={to} onChange={(e) => e.target.value && set({ from: e.target.value })} className="h-9 w-40" />
          <span className="text-sm text-zinc-500">to</span>
          <Input type="date" aria-label="To" defaultValue={to} min={from} onChange={(e) => e.target.value && set({ to: e.target.value })} className="h-9 w-40" />
        </>
      ) : null}
    </div>
  );
}
