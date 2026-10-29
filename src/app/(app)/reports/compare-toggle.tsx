"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

// "Compare to previous period", kept in the URL like the other filters. The
// param is only set when it differs from the dashboard's own default.
export function CompareToggle({ defaultOn }: { defaultOn: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const param = searchParams.get("compare");
  const on = param === null ? defaultOn : param === "1";

  const toggle = (next: boolean) => {
    const params = new URLSearchParams(searchParams);
    if (next === defaultOn) params.delete("compare");
    else params.set("compare", next ? "1" : "0");
    startTransition(() => router.replace(`${pathname}?${params}`, { scroll: false }));
  };

  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-600 select-none dark:text-zinc-400" aria-busy={pending}>
      <input type="checkbox" checked={on} onChange={(e) => toggle(e.target.checked)} className="size-4 accent-[var(--accent)]" />
      Compare to previous period
    </label>
  );
}
