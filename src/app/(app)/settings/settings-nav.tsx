"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

const LINKS = [
  { href: "/settings/profile", label: "Your profile", admin: false },
  { href: "/settings/general", label: "Organization", admin: true },
  { href: "/settings/members", label: "Members", admin: true },
  { href: "/settings/pipeline", label: "Pipeline", admin: true },
  { href: "/settings/sources", label: "Lead sources", admin: true },
  { href: "/settings/capture", label: "Lead capture", admin: true },
];

export function SettingsNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings" className="flex gap-1 overflow-x-auto md:flex-col">
      {LINKS.filter((l) => isAdmin || !l.admin).map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "rounded-md px-3 py-1.5 text-sm whitespace-nowrap",
              active
                ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
