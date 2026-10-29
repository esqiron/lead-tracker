"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Input, Select } from "@/components/ui";

// Filters live in the URL so views are shareable and survive reloads.
function useSetParam() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const setParam = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(name, value);
    else params.delete(name);
    params.delete("page");
    startTransition(() => router.replace(`${pathname}?${params}`, { scroll: false }));
  };
  return { setParam, pending, current: (name: string) => searchParams.get(name) ?? "" };
}

export function ParamSelect({
  name,
  label,
  options,
  allLabel,
  defaultValue = "",
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  allLabel: string;
  // What applies with no param in the URL (e.g. a dashboard's saved filter).
  // Picking "all" over a non-empty default is written as the value "all".
  defaultValue?: string;
}) {
  const { setParam, current } = useSetParam();
  const value = current(name) || defaultValue;
  const choose = (next: string) => setParam(name, next === defaultValue ? "" : next || "all");
  return (
    <Select aria-label={label} autoComplete="off" value={value === "all" ? "" : value} onChange={(e) => choose(e.target.value)} className="h-9 w-auto min-w-36">
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}

export function SearchInput({ placeholder }: { placeholder: string }) {
  const { setParam, current, pending } = useSetParam();
  const committed = current("q");
  const [value, setValue] = useState(committed);

  // Debounce typing into the URL.
  useEffect(() => {
    if (value === committed) return;
    const t = setTimeout(() => setParam("q", value.trim()), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Input
      type="search"
      aria-label="Search"
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      aria-busy={pending}
      className="h-9 w-full sm:w-64"
    />
  );
}
