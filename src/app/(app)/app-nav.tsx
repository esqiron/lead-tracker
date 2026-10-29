"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/contacts", label: "Contacts" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="flex items-center gap-0.5 overflow-x-auto rounded-full bg-white/70 p-1 shadow-[0_10px_30px_-12px_rgba(16,24,40,0.18)] ring-1 ring-hairline dark:bg-zinc-900/70"
    >
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors duration-300 ease-studio",
              active
                ? "bg-zinc-900 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_4px_10px_-4px_rgba(16,24,40,0.45)] dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
